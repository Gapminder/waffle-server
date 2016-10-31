/**
 * Created by korel on 02.02.16.
 */
'use strict';
const DEFAULT_NODE_ENV = 'local';
const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;

const DEFAULT_LOG_LEVELS = Object.freeze({
  local: 'info',
  development: 'info',
  stage: 'warn',
  production: 'error'
});

const DEFAULT_HOST_URLS = Object.freeze({
  local: 'http://localhost',
  development: 'https://waffle-server-dev.gapminderdev.org',
  stage: 'https://waffle-server-stage.gapminderdev.org',
  production: 'https://waffle-server.gapminderdev.org'
});

const LOG_MARKERS = {
  local: 'LOC',
  development: 'DEV',
  stage: 'STG',
  production: 'PRD'
};

const DEFAULT_PORTS = Object.freeze({
  local: 3000,
  development: 443,
  stage: 443,
  production: 443
});

module.exports = Object.freeze({
  HOST_URL: DEFAULT_HOST_URLS[NODE_ENV] || DEFAULT_HOST_URLS[DEFAULT_NODE_ENV],
  PORT: DEFAULT_PORTS[NODE_ENV] || DEFAULT_PORTS[DEFAULT_NODE_ENV],
  INNER_PORT: 3000,

  LOG_MARKER: LOG_MARKERS[NODE_ENV],
  LOG_LEVEL: DEFAULT_LOG_LEVELS[NODE_ENV] || DEFAULT_LOG_LEVELS[DEFAULT_NODE_ENV],

  MONGODB_URL: 'mongodb://localhost:27017',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  NODE_ENV: NODE_ENV,
  SESSION_TIMEOUT: 60000,

  MONGOOSE_DEBUG: false,
  CLEAR_MONGO_DB_COLLECTIONS: false,

  PATH_TO_DDF_FOLDER: '../open-numbers/ddf--gapminder_world',
  PATH_TO_DDF_REPOSITORIES: './ws.import/repos',
  PATH_TO_DIFF_DDF_RESULT_FILE: '../waffle-server-import-cli/requests/operation-result.json',

  CLEAN_EXPORT: false
});
