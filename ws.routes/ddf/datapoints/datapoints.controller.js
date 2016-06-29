'use strict';
var _ = require('lodash');
var cors = require('cors');
var async = require('async');
var express = require('express');
var compression = require('compression');
var md5 = require('md5');

var statsService = require('./datapoints.service');
var commonService = require('../../../ws.services/common.service');
var decodeQuery = require('../../utils').decodeQuery;
var getCacheConfig = require('../../utils').getCacheConfig;

const dataPostProcessors = require('../../data-post-processors');

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
