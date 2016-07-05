'use strict';

module.exports = {
  //versioning
  MAX_VERSION: Number.MAX_SAFE_INTEGER,

  //misc
  LIMIT_NUMBER_PROCESS: 10,

  //cache
  DDF_REDIS_CACHE_LIFETIME: -1,
  DDF_REDIS_CACHE_NAME_ENTITIES: 'entities',
  DDF_REDIS_CACHE_NAME_CONCEPTS: 'concepts',
  DDF_REDIS_CACHE_NAME_DATAPOINTS: 'datapoints'
};
