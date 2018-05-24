import * as fs from 'fs';

const CONCEPTS = 'concepts';
const ENTITIES = 'entities';
const DATAPOINTS = 'datapoints';
const TRANSLATIONS = 'translations';

const CONCEPT_TYPE_BOOLEAN = 'boolean';
const CONCEPT_TYPE_STRING = 'string';
const CONCEPT_TYPE_MEASURE = 'measure';
const CONCEPT_TYPE_ENTITY_DOMAIN = 'entity_domain';
const CONCEPT_TYPE_ENTITY_SET = 'entity_set';
const TIME_CONCEPT_TYPES = ['time', 'year', 'week', 'month', 'day', 'quarter'];
const DEFAULT_ENTITY_GROUP_TYPES = [CONCEPT_TYPE_ENTITY_DOMAIN, CONCEPT_TYPE_ENTITY_SET, ...TIME_CONCEPT_TYPES];

const DESCRETE_CONCEPT_TYPES = [...DEFAULT_ENTITY_GROUP_TYPES , CONCEPT_TYPE_STRING, CONCEPT_TYPE_BOOLEAN, 'interval', 'role', 'custom_type'];
const CONTINUOUS_CONCEPT_TYPES = [CONCEPT_TYPE_MEASURE, 'facet'];

const DEFAULT_CONCEPT_TYPES = [...DESCRETE_CONCEPT_TYPES, ...CONTINUOUS_CONCEPT_TYPES];

const constants: any = {
  WORKDIR: fs.realpathSync('.'),
  MAX_VERSION: Number.MAX_SAFE_INTEGER,

  LIMIT_NUMBER_PROCESS: 10,

  AUTODEPLOY_RETRY_TIMES: 10,
  AUTODEPLOY_RETRY_INTERVAL: 10000,

  DDF_REDIS_CACHE_LIFETIME: -1,
  DDF_REDIS_CACHE_NAME_TRANSLATIONS: TRANSLATIONS,
  DDF_REDIS_CACHE_NAME_DDFQL: 'ddfql',
  DDF_REDIS_CACHE_NAME_MLQL: 'mlql',

  CONCEPTS,
  ENTITIES,
  DATAPOINTS,
  TRANSLATIONS,
  SCHEMA: 'schema',

  ASC_SORTING_DIRECTION: 'asc',
  DESC_SORTING_DIRECTION: 'desc',

  GID: 'gid',
  ORIGIN_ID: 'originId',
  IS_OPERATOR: 'is--',

  CONCEPT_TYPE: 'type',
  CONCEPT_TYPE_MEASURE,
  CONCEPT_TYPE_ENTITY_DOMAIN,
  CONCEPT_TYPE_ENTITY_SET,
  CONCEPT_TYPE_BOOLEAN,
  CONCEPT_TYPE_STRING,

  DEFAULT_USER_EMAIL: 'dev@gapminder.org',

  EXCLUDED_QUERY_PARAMS: ['dataset', 'version', 'v', 'format', 'no-compression', 'key', 'geo.cat', 'force'],
  DEFAULT_ENTITY_GROUP_TYPES,
  TIME_CONCEPT_TYPES,
  DESCRETE_CONCEPT_TYPES,
  CONTINUOUS_CONCEPT_TYPES,
  DEFAULT_CONCEPT_TYPES,
  DEFAULT_DDF_LANGUAGE_FOLDER: 'lang',
  GID_REGEXP: /^[a-z0-9_]*$/,

  VALID_TOKEN_PERIOD_IN_MILLIS: 60 * 60 * 1000, // one hour

  DEFAULT_DATAPOINTS_QUERY_TIMEOUT_MS: 20000,
  DEFAULT_DATAPOINTS_QUERY_LIMIT: 1000000,

  ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS: (7 * 24 * 60) * 60 * 1000, // one week

  ASSETS_ROUTE_BASE_PATH: '/api/ddf/assets',
  ASSETS_EXPECTED_DIR: 'assets',

  LONG_RUNNING_QUERY_THRESHOLD_IN_SECONDS: 30
};

const responseMessages: any = {
  INCORRECT_QUERY_FORMAT: { code: 1, type: 'INCORRECT_QUERY_FORMAT', message: 'Query was sent in incorrect format' },
  MALFORMED_URL: { code: 2, type: 'MALFORMED_URL', message: 'Malformed url was given' },
  RELATIVE_ASSET_PATH: { code: 3, type: 'RELATIVE_ASSET_PATH', message: 'You cannot use relative path constraints like "." or ".." in the asset path'},
  DATASET_NOT_FOUND: { code: 4, type: 'DATASET_NOT_FOUND', message: `Default dataset couldn't be found`},
  WRONG_ASSETS_DIR: (dir: string) => ({ code: 5, type: 'WRONG_ASSETS_DIR', message: `You cannot access directories other than "${dir}"` }),
  URL_CANNOT_BE_ACCESSED_FROM_WS_CLI: { code: 6, type: 'URL_CANNOT_BE_ACCESSED_FROM_WS_CLI', message: 'This url can be accessed only from WS-CLI' },
  INCORRECT_CLI_VERSION: (clientVersion: string, serverVersion: string) =>
    // tslint:disable-next-line:max-line-length
    ({ code: 7, type: 'INCORRECT_CLI_VERSION', message: `Found that your local WS-CLI version ${clientVersion} is incompatible with the selected Waffle Server instance.\n\tPlease reinstall your WS-CLI to version ${serverVersion}. Run "npm install -g waffle-server-import-cli@${serverVersion}"` })

};

export { constants };
export { responseMessages };
