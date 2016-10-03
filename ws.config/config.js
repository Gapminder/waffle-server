/*eslint no-process-env:0 */
'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const DEFAULT_CONFIG = require('./environment.config');

module.exports = (function () {
  const config = {
    NODE_ENV: process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV,
    PORT: process.env.PORT || DEFAULT_CONFIG.PORT,
    INNER_PORT: process.env.INNER_PORT || DEFAULT_CONFIG.INNER_PORT,
    HOST_URL: process.env.HOST_URL || DEFAULT_CONFIG.HOST_URL,

    MONGODB_URL: process.env.MONGODB_URL || DEFAULT_CONFIG.MONGODB_URL,

    REDIS_HOST: process.env.REDIS_HOST || DEFAULT_CONFIG.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT || DEFAULT_CONFIG.REDIS_PORT,

    MONGOOSE_DEBUG: Boolean(process.env.MONGOOSE_DEBUG) || DEFAULT_CONFIG.MONGOOSE_DEBUG,
    CLEAR_MONGO_DB_COLLECTIONS: process.env.CLEAR_MONGO_DB_COLLECTIONS || DEFAULT_CONFIG.CLEAR_MONGO_DB_COLLECTIONS,
    PATH_TO_DDF_FOLDER: process.env.PATH_TO_DDF_FOLDER || DEFAULT_CONFIG.PATH_TO_DDF_FOLDER,
    PATH_TO_DIFF_DDF_RESULT_FILE: process.env.PATH_TO_DIFF_DDF_RESULT_FILE || DEFAULT_CONFIG.PATH_TO_DIFF_DDF_RESULT_FILE,
    PATH_TO_DDF_REPOSITORIES: process.env.PATH_TO_DDF_REPOSITORIES || DEFAULT_CONFIG.PATH_TO_DDF_REPOSITORIES,

    DATASET_NAME: process.env.DATASET_NAME,
    CLEAN_EXPORT: process.env.CLEAN_EXPORT || DEFAULT_CONFIG.CLEAN_EXPORT,
    EXPORT_TO_VERSION: process.env.EXPORT_TO_VERSION,
    INCREMENTAL_EXPORT_TO_VERSION: process.env.INCREMENTAL_EXPORT_TO_VERSION,

    // { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    LOG_LEVEL: process.env.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL,

    LOG_TABS: process.env.LOG_TABS || DEFAULT_CONFIG.LOG_TABS,
    LOG_TRANSPORTS: process.env.LOG_TRANSPORTS ? process.env.LOG_TRANSPORTS.split(',') : DEFAULT_CONFIG.LOG_TRANSPORTS,

    DEFAULT_OPTIONS_CONVERTING_JSON_TO_CSV: {
      DELIMITER: {
        FIELD: ';',
        ARRAY: ',',
        WRAP: '"'
      },
      EOL: '\n',
      PARSE_CSV_NUMBERS: false
    },

    DEFAULT_USER_PASSWORD: process.env.DEFAULT_USER_PASSWORD
  };

  const REQUIRED_ENVIRONMENT_VARIABLES = Object.freeze([
    'MONGODB_URL',
  ]);

  // Check that all the REQUIRED VARIABLES was setup.
  if (['production', 'stage'].some(env => config.NODE_ENV === env))
    _.each(REQUIRED_ENVIRONMENT_VARIABLES, function (CURRENT_VARIABLE) {
      if (!process.env[CURRENT_VARIABLE] && !DEFAULT_CONFIG[CURRENT_VARIABLE]) {
        throw new Error(`You need to set up ${CURRENT_VARIABLE}`);
      }
    });

  return config;
}());
