'use strict';

const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const decodeQuery = require('../../utils').decodeQuery;
const entitiesService = require('./entities.service');
const commonService = require('../../../ws.services/common.service');
const getCacheConfig = require('../../utils').getCacheConfig;
const dataPostProcessors = require('../../data-post-processors');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.get('/api/ddf/entities',
    cors(),
    compression({filter: commonService.shouldCompress}),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_ENTITIES),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    decodeQuery,
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
    const domainGid = _.first(req.decodedQuery.where.key);
    const select = req.decodedQuery.select;
    const headers = _.union(domainGid, select);
    const sort = req.decodedQuery.sort;

    const options = {
      headers,
      where,
      sort,
      domainGid,
      datasetName,
      version
    };

    entitiesService.collectEntities(options, (error, result) => {
      if (error) {
        console.error(error);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: error});
      }


      req.rawData = {
        rawDdf: Object.assign({domainGid}, result)
      };

      return next();
    });
  }
};
