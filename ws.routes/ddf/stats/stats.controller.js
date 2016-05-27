'use strict';
var _ = require('lodash');
var cors = require('cors');
var async = require('async');
var express = require('express');
var compression = require('compression');
var md5 = require('md5');

var statsService = require('./stats.service');
var decodeQuery = require('../../utils').decodeQuery;
var getCacheConfig = require('../../utils').getCacheConfig;

// var GeoPropService = require('./geo-props.service');
var dataPostProcessors = require('../../data-post-processors');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  // var neo4jdb = app.get('neo4jDb');
  var logger = app.get('log');
  var config = app.get('config');
  const cache = require('../../../ws.utils/redis-cache')(config);

  /*eslint new-cap:0*/
  var router = express.Router();

  /**
   * @swagger
   * definition:
   *  Graph:
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

  /**
   * @swagger
   * /api/graphs/stats/vizabi-tools:
   *   get:
   *    description: For getting geo-props, geo-time, geo-time-measure
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description: array of columns.
   *        type: string
   *      - name: where
   *        in: query
   *        description:  list of filters
   *        type: string
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


  router.get('/api/ddf/stats',
    cors(),
    compression(),
    getCacheConfig('stats'),
    cache.route(),
    decodeQuery,
    vizabiTools,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function vizabiTools(req, res, next) {
    var select = req.decodedQuery.select;
    var where = req.decodedQuery.where;
    var sort = req.decodedQuery.sort;
    var dataset = _.first(req.decodedQuery.where.dataset);
    var version = _.first(req.decodedQuery.where.version);
    delete where.dataset;
    delete where.version;

    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    async.waterfall([
      async.constant({select, where, sort, dataset, version}),
      // statsService.checkDataset,
      // statsService.checkVersion,
      statsService.getConcepts,
      statsService.getEntities,
      statsService.getDataPoints,
      statsService.mapResult
    ], (err, pipe) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }

      req.wsJson = pipe.result;
      return next();
    });
  }
};
