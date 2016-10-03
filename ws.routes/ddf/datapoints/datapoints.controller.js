'use strict';

const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const compression = require('compression');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');
const constants = require('../../../ws.utils/constants');
const routeUtils = require('../../utils');
const commonService = require('../../../ws.services/common.service');
const datapointService = require('./datapoints.service');
const dataPostProcessors = require('../../data-post-processors');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.get('/api/ddf/datapoints',
    cors(),
    compression({filter: commonService.shouldCompress}),
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DATAPOINTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    routeUtils.decodeQuery,
    ddfDatapointStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
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

    req.ddfDataType = constants.DATAPOINTS;

    const options = {
      select,
      headers,
      domainGids,
      where,
      sort,
      datasetName,
      version
    };

    const onDatapointsCollected = routeUtils.respondWithRawDdf(req, res, next);
    datapointService.collectDatapoints(options, onDatapointsCollected);
  }
};
