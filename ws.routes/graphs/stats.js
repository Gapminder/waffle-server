'use strict';
var _ = require('lodash');
var cache = require('express-redis-cache')();
var cors = require('cors');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var compression = require('compression');
var GeoPropCtrl = require('../geo/geo-properties.controller');
var md5 = require('md5');

var ensureAuthenticated = require('../utils').ensureAuthenticated;
var getCacheConfig = require('../utils').getCacheConfig;

var Geo = mongoose.model('Geo');
var DimensionValues = mongoose.model('DimensionValues');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var neo4jdb = app.get('neo4jDb');

  /*eslint new-cap:0*/
  var router = express.Router();

  router.get('/api/graphs/stats/vizabi-tools',
    getCacheConfig(), cors(), compression(), cache.route({expire: 86400}),
    GeoPropCtrl.parseQueryParams, vizabiTools);

  return app.use(router);

  function vizabiTools(req, res) {
    var select = req.select;
    var category = req.category;
    var where = req.where;
    var measuresSelect = _.difference(select, ['geo', 'time']);
    var geoPosition = select.indexOf('geo');
    var timePosition = select.indexOf('time');
    var headers = select;
    var time = req.query.time;

    var isGeoPropsReq = _.all(select, v=>/^geo/.test(v)) || select;
    var options = {select, where, category, headers, geoPosition, timePosition, measuresSelect, time};
    var actions = [ cb => cb(null, options) ];

    // &where={geo:['afr', 'chn'], time:'1950:2000'}&geo.cat=country,region
    switch (true) {
      // /api/geo
      case (isGeoPropsReq):
        actions.push(getGeoProperties, prepareGeoResponse);
        break;
      // ?select=geo,time
      case (!measuresSelect.length):
        options.select = ['geo'];
        actions.push(getGeoProperties, makeFlattenGeoProps, getGeoTime);
        break;
      // ?select=geo,time,[<measure>[,<measure>...]]
      default:
        actions.push(getGeoProperties, makeFlattenGeoProps, getMeasures);
        break;
    }

    async.waterfall(actions, (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }

      return res.json({success: !err, data: result, error: err});
    });
  }

  function getMeasures(pipe, cb) {
    var resolvedGeos = pipe.resolvedGeos;

    // do measures request
    // prepare cypher query
    var reqWhere = 'WHERE i1.gid in ' + JSON.stringify(pipe.measuresSelect);
    if (pipe.time) {
      var time = parseInt(pipe.time, 10);
      if (time) {
        reqWhere += ' and dv1.value="' + time + '"';
      } else {
        time = JSON.parse(pipe.time);
        reqWhere += [' and dv1.value>="', time.from, '" and dv1.value<="', time.to, '"'].join('');
      }
    }
    var dim1 = 'year';
    var dim2 = 'country';
    var match =
      `MATCH (i1:Indicators)-[:with_dimension]->(:Dimensions{gid: '${dim1}'})-[:with_dimension_value]->(dv1:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues),
        (i1:Indicators)-[:with_dimension]->(:Dimensions{gid: '${dim2}'})-[:with_dimension_value]->(dv2:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues)`;

    var returner = `RETURN collect(i1.gid) as indicator,dv1.value as year, dv2.value as country, collect(iv1.value) as value`;
    var reqQuery = [match, reqWhere, returner].join(' ');
    console.time('cypher');
    neo4jdb.cypherQuery(reqQuery, function (err, resp) {
      console.timeEnd('cypher');
      if (err) {
        return cb(err);
      }

      console.time('format');
      var rows = _.reduce(resp.data, function (result, row) {
        var measuresValuesPosition = 3;
        var measuresNamesPosition = 0;

        var resRow = new Array(pipe.headers.length);
        // [indicators], year, country, [values]
        // time - year
        if (pipe.timePosition !== -1) {
          resRow[pipe.timePosition] = parseInt(row[1], 10);
        }
        // geo - country
        if (pipe.geoPosition !== -1) {
          resRow[pipe.geoPosition] = row[2];
        }

        for (var i = 0; i < row[measuresNamesPosition].length; i++) {
          var currentMeasureName = row[measuresNamesPosition][i];
          var currentMeasureValue = parseFloat(row[measuresValuesPosition][i]);
          resRow[pipe.headers.indexOf(currentMeasureName)] = currentMeasureValue;
        }

        if (pipe.geoPosition === -1 ||
          (pipe.geoPosition !== -1 && resolvedGeos.indexOf(resRow[pipe.geoPosition]) > -1)) {
          result.push(resRow);
        }
        return result;
      }, []);

      console.timeEnd('format');
      return cb(null, {headers: pipe.headers, rows: rows});
    });
  }

  function getGeoProperties(pipe, cb) {
    let select = pipe.select;
    let where = pipe.where;
    let category = pipe.category;
    return GeoPropCtrl.projectGeoProperties(select, where, category, function (err, geoData) {
      pipe.geoData = geoData;

      return cb(err, pipe);
    });
  }

  function prepareGeoResponse(pipe, cb) {
    return cb(null, {headers: pipe.geoData.headers, rows: pipe.geoData.rows});
  }

  function makeFlattenGeoProps(pipe, cb) {
    var resolvedGeos = _.flatten(pipe.geoData.rows);
    pipe.resolvedGeos = resolvedGeos;
    return cb(null, pipe);
  }

  function getGeoTime(pipe, cb) {
    let headers = pipe.headers;
    let geoPosition = pipe.geoPosition;
    let timePosition = pipe.timePosition;
    let resolvedGeos = pipe.resolvedGeos;

    return doCartesianProductOfGeoTime(resolvedGeos, headers, geoPosition, timePosition, cb);
  }

  function doCartesianProductOfGeoTime(resolvedGeos, headers, geoPosition, timePosition, cb) {
    async.waterfall([
      (_cb) => {
        DimensionValues.distinct('value', {'dimensionGid': 'year'})
          .sort()
          .lean()
          .exec((err, dvs) => {
            return _cb(err, dvs);
          });
      },
      (resolvedYears, _cb) => {

        var powerSet = _.chain(resolvedGeos)
          .map(geo => {
            return _.map(resolvedYears, year => {
              var result = new Array(2);
              result[geoPosition] = geo;
              result[timePosition] = year;

              return result;
            });
          }).flatten().value();

        return _cb(null, powerSet);
      }
    ], (err, rows) => {
      return cb(null, {headers: headers, rows: rows});
    });
  }
};
