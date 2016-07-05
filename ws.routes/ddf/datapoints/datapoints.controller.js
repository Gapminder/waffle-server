'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const decodeQuery = require('../../utils').decodeQuery;
const statsService = require('./datapoints.service');
const commonService = require('../../../ws.services/common.service');
const getCacheConfig = require('../../utils').getCacheConfig;
const dataPostProcessors = require('../../data-post-processors');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const logger = app.get('log');
  const config = app.get('config');
  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  router.get('/api/ddf/datapoints',
    cors(),
    compression(),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DATAPOINTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    decodeQuery,
    ddfDatapointStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function ddfDatapointStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const select = req.decodedQuery.select;
    const where = req.decodedQuery.where;
    const sort = req.decodedQuery.sort;
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);
    delete where.dataset;
    delete where.version;
    delete where.v;

    console.time('finish DataPoint stats');
    async.waterfall([
      async.constant({select, where, sort, datasetName, version}),
      commonService.findDefaultDatasetAndTransaction,
      statsService.getConcepts,
      statsService.getEntities,
      statsService.getDataPoints,
      statsService.mapResult
    ], (error, result) => {
      if (error) {
        console.error(error);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: error});
      }
      console.timeEnd('finish DataPoint stats');

      req.wsJson = result;
      return next();
    });
  }
};
