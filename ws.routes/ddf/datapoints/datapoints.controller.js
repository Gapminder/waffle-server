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

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.get('/api/ddf/datapoints',
    cors(),
    compression({filter: commonService.shouldCompress}),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DATAPOINTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    decodeQuery,
    ddfDatapointStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function ddfDatapointStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const where = _.omit(req.decodedQuery.where, constants.EXCLUDED_QUERY_PARAMS);
    const headers = req.decodedQuery.select;
    const sort = req.decodedQuery.sort;
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);

    const pipe = {
      headers,
      where,
      sort,
      datasetName,
      version
    };

    console.time('finish DataPoint stats');
    async.waterfall([
      async.constant(pipe),
      commonService.findDefaultDatasetAndTransaction,
      statsService.getConcepts,
      statsService.getEntities,
      statsService.getDataPoints
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
