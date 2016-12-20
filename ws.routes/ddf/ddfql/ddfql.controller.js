'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const schemaService = require('../../../ws.services/schema.service');
const entitiesService = require('../../../ws.services/entities.service');
const conceptsService = require('../../../ws.services/concepts.service');
const datapointsService = require('../../../ws.services/datapoints.service');
const dataPostProcessors = require('../../data-post-processors');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');

const routeUtils = require('../../utils');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.use(cors());

  router.get('/api/ddf/ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route(),
    compression(),
    routeUtils.bodyFromUrlQuery,
    routeUtils.checkDatasetAccessibility,
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  router.post('/api/ddf/ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route(),
    compression(),
    routeUtils.checkDatasetAccessibility,
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  return app.use(router);

  function getDdfStats(req, res, next) {
    logger.info({req}, 'DDFQL URL');
    logger.info({obj: req.body}, 'DDFQL');

    const from = _.get(req, 'body.from', null);
    const onEntriesCollected = routeUtils.respondWithRawDdf(req, res, next);

    if (!from) {
      return onEntriesCollected(`The filed 'from' must present in query.`);
    }

    const query = _.get(req, 'body', {});
    const where = _.get(req, 'body.where', {});
    const language = _.get(req, 'body.language', {});
    const select = _.get(req, 'body.select.value', []);
    const domainGids = _.get(req, 'body.select.key', []);
    const headers = _.union(domainGids, select);
    const sort = _.get(req, 'body.order_by', []);
    const groupBy = _.get(req, 'body.group_by', {});
    const datasetName = _.get(req, 'body.dataset', null);
    const version = _.get(req, 'body.version', null);

    const options = {
      user: req.user,
      from,
      select,
      headers,
      domainGids,
      where,
      sort,
      groupBy,
      datasetName,
      version,
      query,
      language
    };

    req.ddfDataType = from;
    if (from === constants.DATAPOINTS) {
      return datapointsService.collectDatapointsByDdfql(options, onEntriesCollected);
    } else if (from === constants.ENTITIES) {
      return entitiesService.collectEntitiesByDdfql(options, onEntriesCollected);
    } else if (from === constants.CONCEPTS) {
      return conceptsService.collectConceptsByDdfql(options, onEntriesCollected);
    } else if (queryToSchema(from)) {
      req.ddfDataType = constants.SCHEMA;
      const onSchemaEntriesFound = routeUtils.respondWithRawDdf(req, res, next);
      return schemaService.findSchemaByDdfql(options, onSchemaEntriesFound);
    } else {
      return onEntriesCollected(`Value '${from}' in the 'from' field isn't supported yet.`);
    }
  }
};

function queryToSchema(from) {
  return _.endsWith(from, '.schema');
}
