#!/usr/bin/env node

import {ExecOutputReturnValue} from 'shelljs';
import * as shell from 'shelljs';

import { logger } from './ws.config/log';
import { ChildProcess } from 'child_process';
import { hostname } from 'os';

const NODE_ENV = process.env.NODE_ENV;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const PORT = process.env.PORT || 3000;
const THRASHING_MACHINE = process.env.THRASHING_MACHINE || 'false';
const LOGS_SYNC_DISABLED = process.env.LOGS_SYNC_DISABLED;
const VERSION = require('./package.json').version;
const STACK_NAME = process.env.STACK_NAME;
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const RELEASE_DATE: Date = new Date();
const TELEGRAF_DEBUG_MODE = process.env.TELEGRAF_DEBUG_MODE || 'false';
const INFLUXDB_HOST = process.env.INFLUXDB_HOST;
const INFLUXDB_PORT = process.env.INFLUXDB_PORT || 8086;
const INFLUXDB_DATABASE_NAME = process.env.INFLUXDB_DATABASE_NAME;
const INFLUXDB_USER = process.env.INFLUXDB_USER;
const INFLUXDB_PASSWORD = process.env.INFLUXDB_PASSWORD;

const IS_LOCAL_ENVIRONMENT = typeof NODE_ENV === 'undefined' || NODE_ENV === 'local';
const IS_DEVELOPMENT_ENVIRONMENT = NODE_ENV === 'development';
const IS_THRASHING_MACHINE = THRASHING_MACHINE === 'true';
const MACHINE_SUFFIX = process.env.MACHINE_SUFFIX || (IS_THRASHING_MACHINE ? 'TM' : 'WS');

const runWaffleServerCommand = `/usr/bin/pm2 start ecosystem.config.js`;
const runWaffleServerThrashingMachineCommand = `THRASHING_MACHINE=true /usr/bin/pm2-docker start ecosystem.config.js`;

if (!REDIS_HOST) {
  logger.info('-- ERROR: REDIS_HOST is not set. Exit.');
  process.exit(1);
}
logger.info(`++ Redis address: ${REDIS_HOST}`);

if (!LOGS_SYNC_DISABLED) {
  shell.exec('service rsyslog restart');
}

runTelegrafService();

if (IS_THRASHING_MACHINE) {
  logger.info('RUN command: start Thrashing machine');
  startWaffleServerThrashingMachine();
} else {
  startWaffleServer();
}

function isWaffleServerNotRunning(): boolean {
  const numberStartedProcess: ExecOutputReturnValue | ChildProcess = shell.exec('ls $HOME/.pm2/pids/ | grep "[WS|TM]" | wc -l', { silent: true });
  logger.info(numberStartedProcess);
  return (+numberStartedProcess.stdout) < 1;
}

function runTelegrafService(): void {
  logger.info('RUN command: service telegraf');
  const echoCommand = 'echo';
  const file = '/etc/default/telegraf';
  const commands = [
    `> ${file}`,
    `${echoCommand} "export NODE_ENV=\"${NODE_ENV}\"" >> ${file}`,
    `${echoCommand} "export RELEASE_DATE=\"${RELEASE_DATE.toISOString()}\"" >> ${file}`,
    `${echoCommand} "export STACK_NAME=\"${STACK_NAME}\"" >> ${file}`,
    `${echoCommand} "export TELEGRAF_DEBUG_MODE=\"${TELEGRAF_DEBUG_MODE}\"" >> ${file}`,
    `${echoCommand} "export INFLUXDB_HOST=\"${INFLUXDB_HOST}\"" >> ${file}`,
    `${echoCommand} "export INFLUXDB_PORT=\"${INFLUXDB_PORT}\"" >> ${file}`,
    `${echoCommand} "export INFLUXDB_DATABASE_NAME=\"${INFLUXDB_DATABASE_NAME}\"" >> ${file}`,
    `${echoCommand} "export INFLUXDB_USER=\"${INFLUXDB_USER}\"" >> ${file}`,
    `${echoCommand} "export INFLUXDB_PASSWORD=\"${INFLUXDB_PASSWORD}\"" >> ${file}`,
    `${echoCommand} "export MACHINE_SUFFIX=\"${MACHINE_SUFFIX}\"" >> ${file}`,
    `${echoCommand} "export VERSION=\"${VERSION}\"" >> ${file}`,
    `${echoCommand} "export AWS_DEFAULT_REGION=\"${AWS_DEFAULT_REGION}\"" >> ${file}`,
    `${echoCommand} "export AWS_ACCESS_KEY_ID=\"${AWS_ACCESS_KEY_ID}\"" >> ${file}`,
    `${echoCommand} "export AWS_SECRET_ACCESS_KEY=\"${AWS_SECRET_ACCESS_KEY}\"" >> ${file}`,
    `service telegraf restart`
  ];

  commands.forEach((command: string) => {
    shell.exec(command);

    if (shell.error()) {
      logger.error(shell.error());
      process.exit(2);
    }
  });
}

function startWaffleServerThrashingMachine(): void {
  if (isWaffleServerNotRunning()) {
    logger.info('Waffle Server is going to be restarted...');
    shell.exec(runWaffleServerThrashingMachineCommand);
  }
  shell.exec('sleep 10');
}

function startWaffleServer(): void {
  logger.info(`RUN command: start ${NODE_ENV} environment`);
  shell.exec(runWaffleServerCommand, { silent: true });

  if (shell.error()) {
    logger.error(shell.error(), `-- ERROR: Could not start ${NODE_ENV} environment due to internal error. Exit.`);
    shell.exec('sleep 600');
    process.exit(1);
  }

  process.exit(0);
}
