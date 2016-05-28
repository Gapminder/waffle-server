/*eslint no-process-env:0 */
'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const DEFAULT_CONFIG = require('./environment.config');

module.exports = function (app) {
  const REQUIRED_ENVIRONMENT_VARIABLES = Object.freeze([
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    // 'AWS_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'S3_BUCKET',
    'MONGODB_URL', 'NEO4J_URL'
  ]);

  // Check that all the REQUIRED VARIABLES was setup.
  _.each(REQUIRED_ENVIRONMENT_VARIABLES, function (CURRENT_VARIABLE) {
    if (!process.env[CURRENT_VARIABLE] && !DEFAULT_CONFIG[CURRENT_VARIABLE]) {
      throw new Error(`You need to set up ${CURRENT_VARIABLE}`);
    }
  });

  const config = {
    NODE_ENV: process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV,
    PORT: process.env.PORT || DEFAULT_CONFIG.PORT,
    INNER_PORT: process.env.INNER_PORT || DEFAULT_CONFIG.INNER_PORT,
    HOST_URL: process.env.HOST_URL || DEFAULT_CONFIG.HOST_URL,

    MONGODB_URL: process.env.MONGODB_URL || DEFAULT_CONFIG.MONGODB_URL,
    NEO4J_URL: process.env.NEO4J_URL || DEFAULT_CONFIG.NEO4J_URL,

    REDIS_HOST: process.env.REDIS_HOST || DEFAULT_CONFIG.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT || DEFAULT_CONFIG.REDIS_PORT,

    MONGOOSE_DEBUG: process.env.MONGOOSE_DEBUG || DEFAULT_CONFIG.MONGOOSE_DEBUG,
    CLEAR_MONGO_DB_COLLECTIONS: process.env.CLEAR_MONGO_DB_COLLECTIONS || DEFAULT_CONFIG.CLEAR_MONGO_DB_COLLECTIONS,
    PATH_TO_DDF_FOLDER: process.env.PATH_TO_DDF_FOLDER || DEFAULT_CONFIG.PATH_TO_DDF_FOLDER,
    PATH_TO_DIFF_DDF_RESULT_FILE: process.env.PATH_TO_DIFF_DDF_RESULT_FILE || DEFAULT_CONFIG.PATH_TO_DIFF_DDF_RESULT_FILE,
    PATH_TO_DDF_REPOSITORIES: process.env.PATH_TO_DDF_REPOSITORIES || DEFAULT_CONFIG.PATH_TO_DDF_REPOSITORIES,

    DATASET_NAME: process.env.DATASET_NAME,
    CLEAN_EXPORT: process.env.CLEAN_EXPORT || DEFAULT_CONFIG.CLEAN_EXPORT,
    EXPORT_TO_VERSION: process.env.EXPORT_TO_VERSION,
    INCREMENTAL_EXPORT_TO_VERSION: process.env.INCREMENTAL_EXPORT_TO_VERSION,

    // is used npm logging levels (prioritized from 0 to 5, from highest to lowest):
    // { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    LOG_LEVEL: process.env.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL,
    LOG_TRANSPORTS: process.env.LOG_TRANSPORTS
      ? process.env.LOG_TRANSPORTS.split(',')
      : DEFAULT_CONFIG.LOG_TRANSPORTS,
    LOG_TABS: process.env.LOG_TABS || DEFAULT_CONFIG.LOG_TABS,

    DEFAULT_OPTIONS_CONVERTING_JSON_TO_CSV: {
      DELIMITER: {
        FIELD: ';',
        ARRAY: ',',
        WRAP: '"'
      },
      EOL: '\n',
      PARSE_CSV_NUMBERS: false
    },

    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || DEFAULT_CONFIG.AWS_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || DEFAULT_CONFIG.AWS_ACCESS_KEY_ID,
    S3_BUCKET: process.env.S3_BUCKET || DEFAULT_CONFIG.S3_BUCKET
  };

  config.social = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || DEFAULT_CONFIG.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || DEFAULT_CONFIG.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: `${config.HOST_URL}:${config.PORT}/api/auth/google/callback`,
    GOOGLE_SCOPE: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email']
  };

  app.set('config', config);

  return config;
};
