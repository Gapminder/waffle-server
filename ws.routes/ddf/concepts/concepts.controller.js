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

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.get('/api/ddf/concepts',
    cors(),
    compression({filter: commonService.shouldCompress}),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_CONCEPTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    decodeQuery,
    ddfConceptsStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function ddfConceptsStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const where = _.omit(req.decodedQuery.where, constants.EXCLUDED_QUERY_PARAMS);
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);
    const domainGid = _.first(req.decodedQuery.where.key);
    const headers = req.decodedQuery.select;
    const sort = req.decodedQuery.sort;

    let pipe = {
      headers,
      where,
      sort,
      domainGid,
      datasetName,
      version
    };

    console.time('finish Concepts stats');
    return async.waterfall([
      async.constant(pipe),
      commonService.findDefaultDatasetAndTransaction,
      statsService.getConcepts
    ], (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      console.timeEnd('finish Concepts stats');

      req.rawDdf = result;

      return next();
    });
  }
};
