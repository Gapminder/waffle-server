'use strict';
const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');
const md5 = require('md5');

const statsService = require('./concepts.service');
const commonService = require('../../../ws.services/common.service');
const decodeQuery = require('../../utils').decodeQuery;
const getCacheConfig = require('../../utils').getCacheConfig;

const dataPostProcessors = require('../../data-post-processors');

/**
 * @swagger
 * definition:
 *  Stats:
 *     type: object
 *     properties:
 *       header:
 *         type: array
 *         description:  Result will consist array of strings. Example: `["geo", "time", "population"]`
 *       rows:
 *         type: array
 *         description:  Result will consist array of arrays.
 *  Datapoints:
 *     type: object
 *     properties:
 *       geo:
 *         type: string
 *         description:  Example query `?select=geo.latitude,geo.name,geo&geo.cat=country,region`
 *       time:
 *         type: string
 *         description:  Result will consist only from unique geo-time, filtered by time values. Example query `?select=geo,time`
 *       measure:
 *         type: string
 *         description:  Example query `?select=geo,time,population,gini`
 *  Entities:
 *     type: object
 *     properties:
 *       geo-props:
 *         type: string
 *         description: Result will consist only from unique geo-props, filtered by geo values. Example query `?select=geo.latitude,geo.name,geo&geo.cat=country,region`
 *       geo-time:
 *         type: string
 *         description:  Result will consist only from unique geo-time, filtered by time values. Example query `?select=geo,time`
 *       geo-time-measure:
 *         type: string
 *         description:  Example query `?select=geo,time,population,gini`
 *       geo-time-measure (filter by geo):
 *         type: string
 *         description: Example query `?select=geo,time,population,gini&geo=chn`
 *       geo-time-measure (filter time):
 *         type: string
 *         description: Example query `?select=geo,time,population,gini&time=1800`, `?select=geo,time,population,gini&time=2000:2010`
 *  Concepts:
 *     type: object
 *     properties:
 *       geo-props:
 *         type: string
 *         description: Result will consist only from unique geo-props, filtered by geo values. Example query `?select=geo.latitude,geo.name,geo&geo.cat=country,region`
 *       geo-time:
 *         type: string
 *         description:  Result will consist only from unique geo-time, filtered by time values. Example query `?select=geo,time`
 *       geo-time-measure:
 *         type: string
 *         description:  Example query `?select=geo,time,population,gini`
 *       geo-time-measure (filter by geo):
 *         type: string
 *         description: Example query `?select=geo,time,population,gini&geo=chn`
 *       geo-time-measure (filter time):
 *         type: string
 *         description: Example query `?select=geo,time,population,gini&time=1800`, `?select=geo,time,population,gini&time=2000:2010`
 *
 */

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();

  var logger = app.get('log');
  var config = app.get('config');
  const cache = require('../../../ws.utils/redis-cache')(config);

  /*eslint new-cap:0*/
  var router = express.Router();

  router.use([
    cors(),
    compression(),
    // getCacheConfig('stats'),
    // cache.route(),
    decodeQuery
  ]);

  /**
   * @swagger
   * /api/ddf/stats/entities:
   *   get:
   *    description: For getting entities-props list
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description: array of columns.
   *        type: string
   *      - name: where
   *        description: list of filters (optional, shouldn't present in query, it's a virtual parameter, works like union). Example: `{"is--country":[1],"landlocked": ["coastline"]}`
   *        type: object
   *      - name: gapfilling
   *        in: query
   *        description: list of methods for post processing of measures data (isn't supported yet)
   *        type: string
   *    tags:
   *      - Graph
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            $ref: '#/definitions/Graph'
   *      304:
   *        description: cache
   *        schema:
   *          type: array
   *          items:
   *            $ref: '#/definitions/Graph'
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/ddf/concepts',
    ddfConceptsStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function ddfConceptsStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);
    console.time('finish Concepts stats');

    const where = _.chain(req.decodedQuery.where).clone().mapValues(mapWhereClause).value();
    const datasetName = _.first(req.decodedQuery.where.dataset);
    const version = _.first(req.decodedQuery.where.version);
    const domainGid = _.first(req.decodedQuery.where.key);

    const select = req.decodedQuery.select;
    const sort = req.decodedQuery.sort;

    delete where.dataset;
    delete where.version;
    delete where.key;
    delete where['geo.cat'];
    delete where.v;

    async.waterfall([
      async.constant({select, where, sort, domainGid, datasetName, version}),
      commonService.getDataset,
      commonService.getVersion,
      statsService.getConcepts
    ], (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      console.timeEnd('finish Concepts stats');

      req.wsJson = result;
      return next();
    });
  }

  function mapWhereClause(value, key) {
    if ( key.indexOf('is--') === 0 ) {
      return !!_.first(value);
    }

    if ( _.isArray(value) ) {
      return {$in: value};
    }

    return value;
  }
};
