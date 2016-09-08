'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const constants = require('../../../ws.utils/constants');
const schemaService = require('../../../ws.services/schema.service');
const commonService = require('../../../ws.services/common.service');
const entitiesService = require('../entities/entities.service');
const conceptsService = require('../concepts/concepts.service');
const datapointsService = require('../datapoints/datapoints.service');
const dataPostProcessors = require('../../data-post-processors');

const cache = require('../../../ws.utils/redis-cache');
const logger = require('../../../ws.config/log');
const config = require('../../../ws.config/config');

const routeUtils = require('../../utils');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.use(cors());

  router.post('/api/ddf/ql',
    compression({filter: commonService.shouldCompress}),
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
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
    const onEntriesCollected = routeUtils.respondWithRawDdf(req, res, next);

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

    if (from === constants.DATAPOINTS) {
      req.ddfDataType = from;
      return datapointsService.collectDatapointsByDdfql(options, onEntriesCollected);
    } else if (from === constants.ENTITIES) {
      req.ddfDataType = from;
      return entitiesService.collectEntitiesByDdfql(options, onEntriesCollected);
    } else if (from === constants.CONCEPTS) {
      req.ddfDataType = from;
      return conceptsService.collectConceptsByDdfql(options, onEntriesCollected);
    } else if (queryToSchema(from)) {
      req.ddfDataType = constants.SCHEMA;
      req.query.format = 'wsJson';
      const onSchemaEntriesFound = routeUtils.respondWithRawDdf(req, res, next);
      return schemaService.findSchemaByDdfql(options.query, onSchemaEntriesFound);
    } else {
      return onEntriesCollected(`Value '${from}' in the 'from' field isn't supported yet.`);
    }
  }
};

function queryToSchema(from) {
  return _.endsWith(from, '.schema');
}
