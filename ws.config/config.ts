import * as _ from 'lodash';
import { environment as DEFAULT_CONFIG } from './environment.config';
import * as packageJson from '../package.json';

const PRODUCTION_ENVS = new Set(['stage', 'production']);

const config: any = {
  getWsCliVersionSupported(): string {
    return _.get(packageJson, 'dependencies.waffle-server-import-cli') as string;
  },
  NODE_ENV: process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV,
  PORT: process.env.PORT || DEFAULT_CONFIG.PORT,
  HOST_URL: process.env.HOST_URL || DEFAULT_CONFIG.HOST_URL,
  LOG_MARKER: DEFAULT_CONFIG.LOG_MARKER,
  MONGODB_URL: process.env.MONGODB_URL || DEFAULT_CONFIG.MONGODB_URL,

  REDIS_HOST: process.env.REDIS_HOST || DEFAULT_CONFIG.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT || DEFAULT_CONFIG.REDIS_PORT,

  MONGOOSE_DEBUG: (process.env.MONGOOSE_DEBUG === 'true') || DEFAULT_CONFIG.MONGOOSE_DEBUG,
  CLEAR_MONGO_DB_COLLECTIONS: process.env.CLEAR_MONGO_DB_COLLECTIONS || DEFAULT_CONFIG.CLEAR_MONGO_DB_COLLECTIONS,
  PATH_TO_DIFF_DDF_RESULT_FILE: process.env.PATH_TO_DIFF_DDF_RESULT_FILE || DEFAULT_CONFIG.PATH_TO_DIFF_DDF_RESULT_FILE,
  PATH_TO_DDF_REPOSITORIES: process.env.PATH_TO_DDF_REPOSITORIES || DEFAULT_CONFIG.PATH_TO_DDF_REPOSITORIES,

  DATASET_NAME: process.env.DATASET_NAME,
  CLEAN_EXPORT: process.env.CLEAN_EXPORT || DEFAULT_CONFIG.CLEAN_EXPORT,
  EXPORT_TO_VERSION: process.env.EXPORT_TO_VERSION,
  INCREMENTAL_EXPORT_TO_VERSION: process.env.INCREMENTAL_EXPORT_TO_VERSION,

  // { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
  LOG_LEVEL: process.env.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL,
  DEFAULT_USER_PASSWORD: process.env.DEFAULT_USER_PASSWORD,
  THRASHING_MACHINE: process.env.THRASHING_MACHINE
};

config.IS_PRODUCTION = PRODUCTION_ENVS.has(config.NODE_ENV);
config.IS_TEST = config.NODE_ENV === 'test';
config.CAN_POPULATE_DOCUMENTS = config.NODE_ENV === 'local';

const REQUIRED_ENVIRONMENT_VARIABLES = Object.freeze([
  'MONGODB_URL'
]);

// Check that all the REQUIRED VARIABLES was setup.
if (config.IS_PRODUCTION) {
  _.each(REQUIRED_ENVIRONMENT_VARIABLES, (CURRENT_VARIABLE: string) => {
    if (!process.env[CURRENT_VARIABLE] && !DEFAULT_CONFIG[CURRENT_VARIABLE]) {
      throw Error(`You need to set up ${CURRENT_VARIABLE}`);
    }
  });
}

export { config };
