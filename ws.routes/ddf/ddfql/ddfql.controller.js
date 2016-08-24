'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const entitiesService = require('../entities/entities.service');
const conceptsService = require('../concepts/concepts.service');
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
    getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route({expire: constants.DDF_REDIS_CACHE_LIFETIME}),
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function getDdfStats(req, res, next) {
    logger.debug('\nURL: %s\nPOST: %s', req.originalUrl, JSON.stringify(req.body, null, '\t'));

    const from = req.body.from;
    const onEntriesCollected = doDataTransfer(req, res, next);

    if (!from) {
      return onEntriesCollected(`The filed 'from' must present in query.`);
    }

    const query = _.get(req, 'body', {});
    const where = _.get(req, 'body.where', {});
    const select = _.get(req, 'body.select.value', []);
    const domainGids = _.get(req, 'body.select.key', []);
    const headers = _.union(domainGids, select);
    const sort = _.get(req, 'body.order_by', {});
    const groupBy = _.get(req, 'body.group_by', {});
    const datasetName = _.chain(req).get('body.dataset', []).first().value();
    const version = _.chain(req).get('body.version', []).first().value();

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

    switch (from) {
      case 'datapoints':
        return datapointService.collectDatapointsByDdfql(options, onEntriesCollected);
      case 'entities':
        return entitiesService.collectEntitiesByDdfql(options, onEntriesCollected);
      case 'concepts':
        return conceptsService.collectConceptsByDdfql(options, onEntriesCollected);
      default:
        return onEntriesCollected(`Value '${from}' in the 'from' field isn't supported yet.`);
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
