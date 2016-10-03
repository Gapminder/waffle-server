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
const entitiesService = require('./entities.service');
const dataPostProcessors = require('../../data-post-processors');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.get('/api/ddf/entities',
    cors(),
    compression({filter: commonService.shouldCompress}),
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_ENTITIES),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    routeUtils.decodeQuery,
    ddfEntitiesStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function ddfEntitiesStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const where = _.omit(req.decodedQuery.where, constants.EXCLUDED_QUERY_PARAMS);
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);
    const domainGids = req.decodedQuery.where.key;
    const domainGid = _.first(domainGids);
    const select = req.decodedQuery.select;
    const headers = _.isEmpty(select) ? [] : _.union([domainGid], select);
    const sort = req.decodedQuery.sort;

    req.ddfDataType = constants.ENTITIES;

    const options = {
      headers,
      select,
      where,
      sort,
      domainGid,
      datasetName,
      version
    };

    const onEntitiesCollected = routeUtils.respondWithRawDdf(req, res, next);
    entitiesService.collectEntities(options, onEntitiesCollected);
  }
};
