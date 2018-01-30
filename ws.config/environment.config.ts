import * as path from 'path';

const DEFAULT_NODE_ENV = 'local';
const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;

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
  HOST_URL: DEFAULT_HOST_URLS[NODE_ENV],
  PORT: DEFAULT_PORT,

  LOG_MARKER: LOG_MARKERS[NODE_ENV],
  LOG_LEVEL: DEFAULT_LOG_LEVELS[NODE_ENV] || DEFAULT_LOG_LEVELS[DEFAULT_NODE_ENV],

  MONGODB_URL: 'mongodb://localhost:27017/ws_ddf_local',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  NODE_ENV,
  SESSION_TIMEOUT: 60000,

  MONGOOSE_DEBUG: false,
  CLEAR_MONGO_DB_COLLECTIONS: false,

  PATH_TO_DDF_REPOSITORIES: path.join(__dirname, '../ws.import/repos'),
  PATH_TO_DIFF_DDF_RESULT_FILE: path.join(__dirname, '../ws.import/diffs'),

  CLEAN_EXPORT: false
});

export { environment };
