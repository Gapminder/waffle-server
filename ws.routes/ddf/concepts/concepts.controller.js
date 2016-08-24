'use strict';
const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const decodeQuery = require('../../utils').decodeQuery;
const conceptsService = require('./concepts.service');
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
    const domainGids = _.first(req.decodedQuery.where.key);
    const domainGid = _.first(domainGids);
    const select = req.decodedQuery.select;
    const headers = _.isEmpty(select) ? [] : _.union([domainGid], select);

    const sort = req.decodedQuery.sort;

    let options = {
      headers,
      select,
      where,
      sort,
      domainGid,
      datasetName,
      version
    };

    const onConceptsCollected = doDataTransfer(req, res, next);
    conceptsService.collectConcepts(options, onConceptsCollected);
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
