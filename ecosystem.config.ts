import { config as appConfig } from './ws.config/config';

const MAX_OLD_SPACE_SIZE = appConfig.THRASHING_MACHINE ? 13000 : 6000;
const DEFAULT_INTERPRETER_ARGS = ['--stack_trace_limit=0', `--max_old_space_size=${MAX_OLD_SPACE_SIZE}`];

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    // First application
    {
      name: appConfig.THRASHING_MACHINE ? 'TM' : 'WS',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      listen_timeout: 60000,
      restart_delay: 60000,
      maxMemoryRestart: appConfig.THRASHING_MACHINE ? '12G' : '6G',
      interpreterArgs: DEFAULT_INTERPRETER_ARGS,
      mergeLogs: true,
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
      env: {
        HOSTNAME: appConfig.HOSTNAME,
        PROJECT: appConfig.PROJECT,
        MACHINE_TYPE: appConfig.MACHINE_TYPE,
        REGION: appConfig.REGION,
        IS_MONITORING_NEEDED: appConfig.IS_MONITORING_NEEDED,
        NODE_ENV: appConfig.NODE_ENV,
        DEFAULT_USER_PASSWORD: appConfig.DEFAULT_USER_PASSWORD,
        MONGODB_URL: appConfig.MONGODB_URL,
        NEWRELIC_KEY: appConfig.NEWRELIC_KEY,
        LOG_LEVEL: appConfig.LOG_LEVEL,
        PORT: appConfig.THRASHING_MACHINE ? 80 : appConfig.PORT,
        THRASHING_MACHINE: appConfig.THRASHING_MACHINE,
        INFLUXDB_HOST: appConfig.INFLUXDB_HOST,
        INFLUXDB_PORT: appConfig.INFLUXDB_PORT,
        INFLUXDB_DATABASE_NAME: appConfig.INFLUXDB_DATABASE_NAME,
        INFLUXDB_USER: appConfig.INFLUXDB_USER,
        INFLUXDB_PASSWORD: appConfig.INFLUXDB_PASSWORD
      }
    }
  ]
};
