'use strict';
const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const decodeQuery = require('../../utils').decodeQuery;
const statsService = require('./concepts.service');
const commonService = require('../../../ws.services/common.service');
const getCacheConfig = require('../../utils').getCacheConfig;

const dataPostProcessors = require('../../data-post-processors');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const logger = app.get('log');
  const config = app.get('config');
  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  router.get('/api/ddf/concepts',
    cors(),
    compression(),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_CONCEPTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    decodeQuery,
    ddfConceptsStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function ddfConceptsStats(req, res, next) {
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

    console.time('finish Concepts stats');
    async.waterfall([
      async.constant({select, where, sort, domainGid, datasetName, version}),
      commonService.findDefaultDatasetAndTransaction,
      statsService.getConcepts
    ], (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      console.timeEnd('finish Concepts stats');

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
