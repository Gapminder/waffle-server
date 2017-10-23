const { config: appConfig } = require('./ws.config/config');

const MAX_OLD_SPACE_SIZE = appConfig.THRASHING_MACHINE ? 10000 : 3000;
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
      instances: appConfig.THRASHING_MACHINE ? 1 : 'max',
      exec_mode: 'cluster',
      minUptime: appConfig.THRASHING_MACHINE ? 180000 : 500,
      maxMemoryRestart: appConfig.THRASHING_MACHINE ? '7G' : '2G',
      interpreterArgs: DEFAULT_INTERPRETER_ARGS,
      mergeLogs: true,
      out_file: 'logs/out.log',
      error_file: 'logs/err.log',
      env: {
        NODE_ENV: appConfig.NODE_ENV,
        DEFAULT_USER_PASSWORD: appConfig.DEFAULT_USER_PASSWORD,
        MONGODB_URL: appConfig.MONGODB_URL,
        NEWRELIC_KEY: appConfig.NEWRELIC_KEY,
        LOG_LEVEL: appConfig.LOG_LEVEL,
        INNER_PORT: appConfig.IS_PRODUCTION && appConfig.THRASHING_MACHINE ? '80' : appConfig.INNER_PORT,
        THRASHING_MACHINE: appConfig.THRASHING_MACHINE
      }
    }
  ]
};
