'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var async = require('async');
var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../utils');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var indicatorValues = serviceLocator.repositories.get('IndicatorValues');
  var Indicators = require('mongoose').model('Indicators');
  var dimensions = serviceLocator.repositories.get('Dimensions');

  app.get('/api/admin/chart/:versionId/:indicatorId',
    compression(), u.getCacheConfig('chart'), cache.route(),
    getChartData);
  app.get('/api/admin/chart-csv/:versionId/:indicatorId',
    compression(), u.getCacheConfig('chart-csv'), cache.route(), getChartCsvData);

  function getChartData(req, res) {
    var LIMIT = 999999;
    var SKIP = 0;

    async.waterfall([
      function (cb) {
        return cb(null, {});
      },
      function (pipe, cb) {
        return dimensions.pagedList({
          limit: LIMIT,
          skip: SKIP
        }, function (err, data) {
          pipe.dimensions = [];
          data.data.forEach(function (record) {
            pipe.dimensions[record._id] = record;
          });

          return cb(err, pipe);
        });
      },
      function (pipe, cb) {
        Indicators.findById(req.params.indicatorId, {title: true}, function (err, indicator){
          pipe.indicator = indicator;
          return cb(err, pipe);
        });
      }
    ], function (err, pipe) {
      return indicatorValues.getByVersion({
        limit: LIMIT,
        skip: SKIP,
        filter: {
          indicatorId: req.params.indicatorId,
          versionId: req.params.versionId
        }
      }, function (err, data) {
        if (err) {
          logger.error(err);
          return res.json({error: err});
        }

        var resultData = [];
        data.data.forEach(function (record) {
          var _record = {
            score: record.v
          };

          _record[pipe.dimensions[record.ds[0].d].name === 'countries' ? 'geo' : 'time'] = record.ds[0].v;
          _record[pipe.dimensions[record.ds[1].d].name === 'countries' ? 'geo' : 'time'] = record.ds[1].v;

          resultData.push({geo: _record.geo, time: _record.time, score: _record.score});
        });

        return res.json({success: true, data: resultData, indicator: pipe.indicator});
      });
    });
  }

  function getChartCsvData(req, res) {
    res.setHeader('Content-type', 'text/csv;charset=utf-8');
    console.log(path.join(__dirname, '_tmpData/basic-indicators.csv'));
    res.write(fs.readFileSync(path.join(__dirname, '_tmpData/basic-indicators.csv')));
    res.end();
  }
};
