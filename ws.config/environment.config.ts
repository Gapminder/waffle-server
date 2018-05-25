import * as path from 'path';

const DEFAULT_NODE_ENV = 'local';
const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;
const packageJson = require('../package.json');
const VERSION = packageJson.version.replace(/\./g, '-');

const DEFAULT_LOG_LEVELS = Object.freeze({
  local: 'info',
  test: 'info',
  development: 'info',
  stage: 'warn',
  production: 'error'
});

const DEFAULT_HOST_URLS = Object.freeze({
  local: 'http://localhost',
  test: 'http://localhost',
  development: 'https://waffle-server-dev.gapminderdev.org',
  stage: 'https://waffle-server-stage.gapminderdev.org',
  production: 'https://waffle-server.gapminder.org'
});

const LOG_MARKERS = {
  local: 'LOC',
  test: 'TEST',
  development: 'DEV',
  stage: 'STG',
  production: 'PRD'
};

const DEFAULT_PORT = 3000;

const environment = Object.freeze({
  HOSTNAME: 'localhost',
  HOST_URL: DEFAULT_HOST_URLS[NODE_ENV],
  PORT: DEFAULT_PORT,
  VERSION,

  LOG_MARKER: LOG_MARKERS[NODE_ENV],
  LOG_LEVEL: DEFAULT_LOG_LEVELS[NODE_ENV] || DEFAULT_LOG_LEVELS[DEFAULT_NODE_ENV],

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  NODE_ENV,
  SESSION_TIMEOUT: 60000,

  PATH_TO_DDF_REPOSITORIES: path.join(__dirname, '../ws-import'),
  PATH_TO_DIFF_DDF_RESULT_FILE: path.join(__dirname, '../ws-import'),
  DEFAULT_DATASETS: [],

  IS_MONITORING_NEEDED: true,
  CLEAN_EXPORT: false,

  INFLUXDB_HOST: 'localhost',
  INFLUXDB_PORT: 8086,
  INFLUXDB_DATABASE_NAME: 'waffle-server-default',
  INFLUXDB_USER: 'gapminderdev',
  INFLUXDB_PASSWORD: ''
});

export {environment};
