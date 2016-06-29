'use strict';
var _ = require('lodash');
var cors = require('cors');
var async = require('async');
var express = require('express');
var compression = require('compression');
var md5 = require('md5');

var statsService = require('./entities.service');
var commonService = require('../../../ws.services/common.service');
var decodeQuery = require('../../utils').decodeQuery;
var getCacheConfig = require('../../utils').getCacheConfig;

const dataPostProcessors = require('../../data-post-processors');

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

  router.get('/api/ddf/entities',
    ddfEntitiesStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function ddfEntitiesStats(req, res, next) {
    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);
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
    delete where.v;

    async.waterfall([
      async.constant({select, where, sort, domainGid, datasetName, version}),
      commonService.getDataset,
      commonService.getVersion,
      statsService.getEntities
    ], (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      console.timeEnd('finish Entities stats');

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
