#!/usr/bin/env node

import * as _ from 'lodash';
import * as shell from 'shelljs';

import { logger } from './ws.config/log';

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const HA_REG_EXPIRE = process.env.HA_REG_EXPIRE || 60;
const NODE_PORT = process.env.NODE_PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || 'default';
const THRASHING_MACHINE = process.env.THRASHING_MACHINE;
const LOGS_SYNC_DISABLED = process.env.LOGS_SYNC_DISABLED;

const runWaffleServerCommand = '/usr/bin/forever -o logs/out.log -e logs/err.log start -c \"/usr/bin/node --stack_trace_limit=0 --max_old_space_size=3000\" -m 10 --minUptime 500 --spinSleepTime 600 server.js';
const runWaffleServerThrashingMachineCommand = 'INNER_PORT=80 /usr/bin/node --stack_trace_limit=0 --max_old_space_size=10000 server.js';

if (!REDIS_HOST) {
  logger.info('-- ERROR: REDIS_HOST is not set. Exit.');
  process.exit(1);
}
logger.info(`++ Redis address: ${REDIS_HOST}`);

if (!LOGS_SYNC_DISABLED) {
  shell.exec('service rsyslog restart');
}

if (THRASHING_MACHINE) {
  startWaffleServerThrashingMachine();
} else {
  startWaffleServer();
}

function startWaffleServerThrashingMachine(): void {
  while (true) {
    shell.exec(runWaffleServerThrashingMachineCommand);
    logger.info('Waffle Server is going to be restarted...');
  }
}

function startWaffleServer(): void {
  shell.exec(runWaffleServerCommand,  {silent:true});

  while (true) {
    const myip = shell.exec('/usr/bin/curl -m 2 http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null');
    if (myip.code === 0) {
      const ip = myip.stdout;
      shell.exec(`/usr/bin/redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} setex /upstreams/${SERVICE_NAME}/${process.env.HOSTNAME}  ${HA_REG_EXPIRE} \"${ip} ${ip}:${NODE_PORT}\"`,  {silent:true});
    } else {
      logger.info('-- ERROR: Could not determine local ip address. Exit.');
      process.exit(1);
    }

    const isWaffleServerNotRunning = _.trim((shell.exec('/usr/bin/forever list | /bin/grep server.js | wc -l', {silent: true}) as shell.ExecOutputReturnValue).stdout) !== '1';
    if (isWaffleServerNotRunning) {
      logger.info('-- ERROR: ws is failed to start. Going to start Waffle Server once more...');
      shell.exec('/usr/bin/forever stopall');
      shell.exec(runWaffleServerCommand);
    }

    shell.exec('sleep 2');
  }
}
