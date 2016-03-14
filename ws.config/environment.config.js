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

const DEFAULT_LOG_TRANSPORTS = Object.freeze({
  local: ['console', 'file'],
  development: ['console'],
  stage: ['file'],
  production: ['file']
});

const DEFAULT_HOST_URLS = Object.freeze({
  local: 'http://localhost',
  development: 'https://waffle-server-dev.gapminderdev.org',
  stage: 'https://waffle-server-stage.gapminderdev.org',
  production: 'https://waffle-server.gapminderdev.org'
});

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

  LOG_LEVEL: DEFAULT_LOG_LEVELS[NODE_ENV] || DEFAULT_LOG_LEVELS[DEFAULT_NODE_ENV],
  LOG_TRANSPORTS: DEFAULT_LOG_TRANSPORTS[NODE_ENV] || DEFAULT_LOG_TRANSPORTS[DEFAULT_NODE_ENV],
  LOG_TABS: '\t\t\t',

  NODE_ENV: NODE_ENV,
  SESSION_TIMEOUT: 60000,

  MONGOOSE_DEBUG: false,
  CLEAR_MONGO_DB_COLLECTIONS: false,

  PATH_TO_DDF_FOLDER: '../open-numbers/ddf--gapminder_world/output'
});
