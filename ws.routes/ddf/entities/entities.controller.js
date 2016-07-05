'use strict';
const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const decodeQuery = require('../../utils').decodeQuery;
const statsService = require('./entities.service');
const commonService = require('../../../ws.services/common.service');
const getCacheConfig = require('../../utils').getCacheConfig;
const dataPostProcessors = require('../../data-post-processors');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const logger = app.get('log');
  const config = app.get('config');
  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  router.get('/api/ddf/entities',
    cors(),
    compression(),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_ENTITIES),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    decodeQuery,
    ddfEntitiesStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function ddfEntitiesStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const where = _.chain(req.decodedQuery.where).clone().mapValues(mapWhereClause).value();
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);
    const domainGid = _.first(req.decodedQuery.where.key);

    const select = req.decodedQuery.select;
    const sort = req.decodedQuery.sort;

    delete where.dataset;
    delete where.version;
    delete where.key;
    delete where['geo.cat'];
    delete where.v;

    console.time('finish Entities stats');
    async.waterfall([
      async.constant({select, where, sort, domainGid, datasetName, version}),
      commonService.findDefaultDatasetAndTransaction,
      statsService.getEntities
    ], (error, result) => {
      if (error) {
        console.error(error);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: error});
      }
      console.timeEnd('finish Entities stats');

      req.wsJson = result;
      return next();
    });
  }

  function mapWhereClause(value, key) {
    if ( key.indexOf('is--') === 0 ) {
      return !!_.first(value);
    }

    if ( _.isArray(value) ) {
      return {$in: value};
    }

    return value;
  }
};
