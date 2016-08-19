'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const decodeQuery = require('../../utils').decodeQuery;
const datapointService = require('./datapoints.service');
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

  router.post('/api/ddf/datapoints',
    cors(),
    compression({filter: commonService.shouldCompress}),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DATAPOINTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    getMatchedDdfqlDatapoints
    // dataPostProcessors.gapfilling,
    // dataPostProcessors.toPrecision,
    // dataPostProcessors.pack
  );

  return app.use(router);

  function ddfDatapointStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const where = _.omit(req.decodedQuery.where, constants.EXCLUDED_QUERY_PARAMS);
    const select = req.decodedQuery.select;
    const domainGids = req.decodedQuery.where.key;
    const headers = _.union(domainGids, select);
    const sort = req.decodedQuery.sort;
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);

    const options = {
      select,
      headers,
      domainGids,
      where,
      sort,
      datasetName,
      version
    };

    const onCollectDatapoints = doDataTransfer(req, res, next);
    datapointService.collectDatapoints(options, onCollectDatapoints);
  }

  function getMatchedDdfqlDatapoints(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const query = req.body;
    const where = req.body.where;
    const select = req.body.select.value;
    const domainGids = req.body.select.key;
    const headers = _.union(domainGids, select);
    const sort = req.body.order_by;
    const groupBy = req.body.group_by;
    const datasetName = _.first(req.body.dataset);
    const version = _.first(req.body.version);

    const options = {
      select,
      headers,
      domainGids,
      where,
      sort,
      groupBy,
      datasetName,
      version,
      query
    };

    const onMatchedDatapoints = doDataTransfer(req, res, next);

    datapointService.matchDdfqlToDatapoints(options, onMatchedDatapoints);
  }

  function doDataTransfer(req, res, next) {
    return (error, result) => {
      if (error) {
        logger.error(error);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: error});
      }

      req.rawData = {rawDdf: result};

      return next();
    }
  }
};
