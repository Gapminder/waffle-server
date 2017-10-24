#!/usr/bin/env node

import * as _ from 'lodash';
import {ExecOutputReturnValue} from 'shelljs';
import * as shell from 'shelljs';

import { logger } from './ws.config/log';
import { ChildProcess } from 'child_process';

const NODE_ENV = process.env.NODE_ENV;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const HA_REG_EXPIRE = process.env.HA_REG_EXPIRE || 60;
const NODE_PORT = process.env.NODE_PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || 'default';
const THRASHING_MACHINE = process.env.THRASHING_MACHINE;
const LOGS_SYNC_DISABLED = process.env.LOGS_SYNC_DISABLED;
const KEYMETRICS_LOGIN = process.env.KEYMETRICS_LOGIN;
const KEYMETRICS_PASSWORD = process.env.KEYMETRICS_PASSWORD;

const runWaffleServerCommand = `/usr/bin/pm2 start ecosystem.config.js`;
const runWaffleServerThrashingMachineCommand = `THRASHING_MACHINE=true /usr/bin/pm2 start ecosystem.config.js`;

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

function isWaffleServerNotRunning(): boolean {
  const numberStartedProcess: ExecOutputReturnValue | ChildProcess = shell.exec('ls $HOME/.pm2/pids/ | grep "[WS|TM]" | wc -l', { silent: true });
  logger.info(numberStartedProcess);
  return (+numberStartedProcess.stdout) < 1;
}

function runPM2KeyMetricsLogging(): void {
  if (NODE_ENV === 'development') {
    shell.exec('sleep 10');
    shell.exec(`/usr/bin/pm2 link ${KEYMETRICS_PASSWORD} ${KEYMETRICS_LOGIN}`);
  }
}

function startWaffleServerThrashingMachine(): void {
  while (true) {
    if (isWaffleServerNotRunning()) {
      logger.info('Waffle Server is going to be restarted...');
      shell.exec(runWaffleServerThrashingMachineCommand);
      runPM2KeyMetricsLogging();
    }
    shell.exec('sleep 10');
  }
}

function startWaffleServer(): void {
  shell.exec(runWaffleServerCommand, { silent: true });

  while (true) {
    const myip = shell.exec('/usr/bin/curl -m 2 http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null');
    if (myip.code === 0) {
      const ip = myip.stdout;
      shell.exec(`/usr/bin/redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} setex /upstreams/${SERVICE_NAME}/${process.env.HOSTNAME}  ${HA_REG_EXPIRE} \"${ip} ${ip}:${NODE_PORT}\"`, { silent: true });
    } else {
      logger.info('-- ERROR: Could not determine local ip address. Exit.');
      process.exit(1);
    }

    shell.exec('sleep 10');

    if (isWaffleServerNotRunning()) {
      logger.info('-- ERROR: ws is failed to start. Going to start Waffle Server once more...');
      shell.exec('pm2 stop all && pm2 delete all');
      shell.exec(runWaffleServerCommand);
      runPM2KeyMetricsLogging();
    }

    shell.exec('sleep 10');
  }
}
