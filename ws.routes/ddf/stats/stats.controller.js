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
const dataPostProcessors = require('../../data-post-processors');
const postProcessorsMiddlewares = [
  dataPostProcessors.gapfilling,
  dataPostProcessors.toPrecision,
  dataPostProcessors.format
];

const EntitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');

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

  router.use([cors(), compression()/*, getCacheConfig('stats'), cache.route()*/, decodeQuery, logRequest]);

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
  router.get('/api/ddf/stats/datapoints', ddfDatapointStats, postProcessorsMiddlewares);

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
  router.get('/api/ddf/stats/entities', ddfEntitiesStats, postProcessorsMiddlewares);

  return app.use(router);

  function ddfDatapointStats(req, res, next) {
    console.time('finish DataPoint stats');

    var select = req.decodedQuery.select;
    var where = req.decodedQuery.where;
    var sort = req.decodedQuery.sort;
    var datasetName = _.first(req.decodedQuery.where.dataset);
    var version = _.first(req.decodedQuery.where.version);
    delete where.dataset;
    delete where.version;

    async.waterfall([
      async.constant({select, where, sort, datasetName, version}),
      statsService.getDataset,
      statsService.getVersion,
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
      console.timeEnd('finish DataPoint stats');

      req.wsJson = pipe.result;
      return next();
    });
  }

  function ddfEntitiesStats(req, res, next) {
    console.time('finish Entities stats');

    var where = _.chain(req.decodedQuery.where).clone().mapValues(mapWhereClause).value();
    var datasetName = _.first(req.decodedQuery.where.dataset);
    var version = _.first(req.decodedQuery.where.version);
    let domainGid = _.first(req.decodedQuery.where.key);

    var select = req.decodedQuery.select;
    var sort = req.decodedQuery.sort;

    delete where.dataset;
    delete where.version;
    delete where.key;
    delete where['geo.cat'];

    async.waterfall([
      async.constant({select, where, sort, datasetName, version}),
      statsService.getDataset,
      statsService.getVersion,
      (pipe, cb) => {
        const EntitiesRepository = new EntitiesRepositoryFactory({datasetId: pipe.dataset._id, version: pipe.version});
        EntitiesRepository
          .currentVersion()
          .findEntityProperties(domainGid, select, where, (error, entities) => {
            pipe.result = entities;
            return cb(error, pipe);
          });
      }
    ], (err, pipe) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      console.timeEnd('finish Entities stats');

      req.wsJson = pipe.result;
      return next();
    });
  }

  function logRequest(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);
    return next();
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
