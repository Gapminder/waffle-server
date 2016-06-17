'use strict';
var _ = require('lodash');
var cors = require('cors');
var async = require('async');
var express = require('express');
var compression = require('compression');
var md5 = require('md5');

var statsService = require('./datapoints.service');
var commonService = require('../../../ws.utils/common.service');
var decodeQuery = require('../../utils').decodeQuery;
var getCacheConfig = require('../../utils').getCacheConfig;

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

  // var neo4jdb = app.get('neo4jDb');
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
   * /api/ddf/stats/datapoints:
   *   get:
   *    description: For getting datapoints for choosen geo-time-measure(s). Take into account, if you choose Entity Domain, as a column, then WS calculates all datapoints for each matched Entity Set (geo -> region + country + city... )
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: dataset
   *        in: query
   *        description: certain name of dataset (ddf--gapminder_world).
   *        type: string
   *      - name: version
   *        in: query
   *        description: certain version of dataset (timestamp, optional, if it is absent, it will be latest).
   *        type: number
   *      - name: gapfilling
   *        in: query
   *        description: list of methods for post processing of measures data (isn't supported yet)
   *        type: string
   *      - name: precisionLevel
   *        in: query
   *        description: Optional. Default value: 0.
   *        type: number
   *      - name: format
   *        in: query
   *        description: Optional. Default value: wsJson. Possible values: 'csv/json/wsJson'
   *        type: string
   *    tags:
   *      - Datapoints Stats
   *    responses:
   *      200:
   *        description: An array of datapoints in certain column order (pointed out in select)
   *        schema:
   *         type: object
   *         items:
   *            $ref: '#/definitions/Stats'
   *      304:
   *        description: cache
   *        schema:
   *          type: array
   *          items:
   *            $ref: '#/definitions/Stats'
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/ddf/datapoints',
    ddfDatapointStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function ddfDatapointStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);
    console.time('finish DataPoint stats');

    var select = req.decodedQuery.select;
    var where = req.decodedQuery.where;
    var sort = req.decodedQuery.sort;
    var datasetName = _.first(req.decodedQuery.where.dataset);
    var version = _.first(req.decodedQuery.where.version);
    delete where.dataset;
    delete where.version;
    delete where.v;

    async.waterfall([
      async.constant({select, where, sort, datasetName, version}),
      commonService.getDataset,
      commonService.getVersion,
      statsService.getConcepts,
      statsService.getEntities,
      statsService.getDataPoints,
      statsService.mapResult
    ], (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      console.timeEnd('finish DataPoint stats');

      req.wsJson = result;
      return next();
    });
  }
};
