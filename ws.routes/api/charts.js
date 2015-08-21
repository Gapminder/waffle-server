'use strict';
var async = require('async');
var fs = require('fs');
var _ = require('lodash');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var indicatorValues = serviceLocator.repositories.get('IndicatorValues');
  var dimensions = serviceLocator.repositories.get('Dimensions');

  app.get('/api/admin/chart/:versionId/:indicatorId', getChartData);
  app.get('/api/admin/chart-csv/:versionId/:indicatorId', getChartCsvData);

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

        return res.json({success: true, data: resultData});
      });
    });
  }

  function getChartCsvData(req, res) {
    res.setHeader('Content-type', 'text/csv;charset=utf-8');
    res.write(fs.readFileSync('/home/slava/waffle-server/ws.routes/api/_tmpData/basic-indicators.csv'));
    res.end();
  }
};
