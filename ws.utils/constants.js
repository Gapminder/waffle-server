'use strict';

const CONCEPTS = 'concepts';
const ENTITIES = 'entities';
const DATAPOINTS = 'datapoints';
const TRANSLATIONS = 'translations';

const TIME_CONCEPT_TYPES = ['time', 'year', 'week', 'month', 'day', 'quarter'];
const DEFAULT_ENTITY_GROUP_TYPES = ['entity_domain', 'entity_set', ... TIME_CONCEPT_TYPES];

module.exports = {
  //versioning
  MAX_VERSION: Number.MAX_SAFE_INTEGER,

  //misc
  LIMIT_NUMBER_PROCESS: 10,

  //cache
  DDF_REDIS_CACHE_LIFETIME: -1,
  DDF_REDIS_CACHE_NAME_TRANSLATIONS: TRANSLATIONS,
  DDF_REDIS_CACHE_NAME_ENTITIES: ENTITIES,
  DDF_REDIS_CACHE_NAME_CONCEPTS: CONCEPTS,
  DDF_REDIS_CACHE_NAME_DATAPOINTS: DATAPOINTS,
  DDF_REDIS_CACHE_NAME_DDFQL: 'ddfql',

  CONCEPTS,
  ENTITIES,
  DATAPOINTS,
  TRANSLATIONS,
  SCHEMA: 'schema',

  ASC_SORTING_DIRECTION: 'asc',
  DESC_SORTING_DIRECTION: 'desc',

  GID: 'gid',
  ORIGIN_ID: 'originId',
  IS_OPERATOR: '.is--',
  CONCEPT_TYPE: 'type',
  CONCEPT_TYPE_MEASURE: 'measure',
  CONCEPT_TYPE_ENTITY_DOMAIN: 'entity_domain',
  CONCEPT_TYPE_ENTITY_SET: 'entity_set',

  DEFAULT_USER_EMAIL: 'dev@gapminder.org',

  EXCLUDED_QUERY_PARAMS: ['dataset', 'version', 'v', 'format', 'no-compression', 'key', 'geo.cat', 'force'],
  DEFAULT_ENTITY_GROUP_TYPES,
  DEFAULT_DDF_LANGUAGE_FOLDER: 'lang',
  TIME_CONCEPT_TYPES,
  GID_REGEXP: /^[a-z0-9_]*$/,

  VALID_TOKEN_PERIOD_IN_MILLIS: 60 * 60 * 1000 // one hour
};
