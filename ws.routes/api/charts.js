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
  app.get('/api/admin/chartcsv/:versionId/:indicatorId', getChartCsvData);

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

        var filledHash = {};
        var countries = [];
        var minTime = 9999;
        var maxTime = 0;
        data.data.forEach(function (record) {
          var _record = {
            score: record.v
          };

          _record[pipe.dimensions[record.ds[0].d].name === 'countries' ? 'geo' : 'time'] = record.ds[0].v;
          _record[pipe.dimensions[record.ds[1].d].name === 'countries' ? 'geo' : 'time'] = record.ds[1].v;

          /*if (_record.geo !== 'Benin' && _record.geo !== 'Botswana') {
            return;
          }*/

          if (!filledHash[_record.geo]) {
            filledHash[_record.geo] = {};
          }

          filledHash[_record.geo][_record.time] = _record.score;

          minTime = Math.min(minTime, Number(_record.time));
          maxTime = Math.max(maxTime, Number(_record.time));
          if (countries.indexOf(_record.geo) < 0) {
            countries.push(_record.geo);
          }
        });

        var resultData = [];
        for (var i = 0; i < countries.length; i++) {
          for (var time = minTime; time <= maxTime; time++) {
            var _time = time.toString();
            resultData.push({geo: countries[i], time: _time, score: filledHash[countries[i]][_time] || 0});
          }
        }

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
