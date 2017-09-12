import * as _ from 'lodash';

const CONCEPTS = 'concepts';
const ENTITIES = 'entities';
const DATAPOINTS = 'datapoints';
const TRANSLATIONS = 'translations';

const MAPPER_TIME_CONCEPT_TYPES = {
  year: 'YEAR_TYPE',
  time: 'YEAR_TYPE',
  week: 'WEEK_TYPE',
  month: 'MONTH_TYPE',
  day: 'DATE_TYPE',
  quarter: 'QUARTER_TYPE'
};
const TIME_CONCEPT_TYPES = _.keys(MAPPER_TIME_CONCEPT_TYPES);
const CONCEPT_TYPE_ENTITY_DOMAIN = 'entity_domain';
const CONCEPT_TYPE_ENTITY_SET = 'entity_set';
const DEFAULT_ENTITY_GROUP_TYPES = [CONCEPT_TYPE_ENTITY_DOMAIN, CONCEPT_TYPE_ENTITY_SET, ...TIME_CONCEPT_TYPES];

const constants: any = {
  MAX_VERSION: Number.MAX_SAFE_INTEGER,

  LIMIT_NUMBER_PROCESS: 10,

  DDF_REDIS_CACHE_LIFETIME: -1,
  DDF_REDIS_CACHE_NAME_TRANSLATIONS: TRANSLATIONS,
  DDF_REDIS_CACHE_NAME_DDFQL: 'ddfql',

  CONCEPTS,
  ENTITIES,
  DATAPOINTS,
  TRANSLATIONS,
  SCHEMA: 'schema',

  ASC_SORTING_DIRECTION: 'asc',
  DESC_SORTING_DIRECTION: 'desc',

  MONGO_SPECIAL_FIELDS: ['_id', '_v'],

  GID: 'gid',
  ORIGIN_ID: 'originId',
  IS_OPERATOR: 'is--',
  PROPERTIES: 'properties',
  PARSED_PROPERTIES: 'parsedProperties',
  TYPE: 'type',
  CONCEPT_TYPE: 'concept_type',
  CONCEPT_TYPE_MEASURE: 'measure',
  CONCEPT_TYPE_ENTITY_DOMAIN,
  CONCEPT_TYPE_ENTITY_SET,

  DEFAULT_USER_EMAIL: 'dev@gapminder.org',

  EXCLUDED_QUERY_PARAMS: ['dataset', 'version', 'v', 'format', 'no-compression', 'key', 'geo.cat', 'force'],
  DEFAULT_ENTITY_GROUP_TYPES,
  DEFAULT_DDF_LANGUAGE_FOLDER: 'lang',
  TIME_CONCEPT_TYPES,
  GID_REGEXP: /^[a-z0-9_]*$/,

  VALID_TOKEN_PERIOD_IN_MILLIS: 60 * 60 * 1000, // one hour

  DEFAULT_DATAPOINTS_QUERY_TIMEOUT_MS: 20000,
  DEFAULT_DATAPOINTS_QUERY_LIMIT: 1000000,
  MONGODB_ALLOW_DISK_USE: true,

  ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS: (7 * 24 * 60) * 60 * 1000, // one week

  ASSETS_ROUTE_BASE_PATH: '/api/ddf/assets',
  ASSETS_EXPECTED_DIR: 'assets',

  LONG_RUNNING_QUERY_THRESHOLD_IN_SECONDS: 30
};

export { constants };
