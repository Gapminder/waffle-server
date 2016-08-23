'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const entitiesService = require('../entities/entities.service');
const datapointService = require('../datapoints/datapoints.service');
const commonService = require('../../../ws.services/common.service');
const getCacheConfig = require('../../utils').getCacheConfig;
const dataPostProcessors = require('../../data-post-processors');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.post('/api/ddf/ql',
    cors(),
    compression({filter: commonService.shouldCompress}),
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DATAPOINTS),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function getDdfStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    const from = req.body.from;
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
      from,
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

    const onMatchedEntries = doDataTransfer(req, res, next);

    switch (from) {
      case 'datapoints':
        return datapointService.collectDatapointsByDdfql(options, onMatchedEntries);
      case 'entities':
        return entitiesService.collectEntitiesByDdfql(options, onMatchedEntries);
      default:
        return onMatchedEntries(`Value '${from}' in the 'from' field isn't supported yet.`);
        break;
    }
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
