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

var decodeQuery = require('../utils').decodeQuery;
var getCacheConfig = require('../utils').getCacheConfig;

var Geo = mongoose.model('Geo');
var DimensionValues = mongoose.model('DimensionValues');

var dataPostProcessors = require('../data-post-processors');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var neo4jdb = app.get('neo4jDb');
  var logger = app.get('log');
  var config = app.get('config');

  /*eslint new-cap:0*/
  var router = express.Router();

  router.get('/api/graphs/stats/vizabi-tools',
    getCacheConfig(),
    cors(),
    compression(),
    cache.route({expire: 86400}),
    decodeQuery,
    vizabiTools,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.format
  );

  return app.use(router);

  function vizabiTools(req, res, next) {
    var select = req.decodedQuery.select;
    var category = req.decodedQuery.where['geo.cat'];
    var where = req.decodedQuery.where;
    var sort = req.decodedQuery.sort;
    var measuresSelect = _.difference(select, ['geo', 'time']);
    var geoPosition = select.indexOf('geo');
    var timePosition = select.indexOf('time');
    var headers = select;
    var time = req.decodedQuery.where.time || [];

    logger.debug('URL: \n%s%s', config.LOG_TABS, req.originalUrl);

    var isGeoPropsReq = _.all(select, v=>/^geo/.test(v)) || select;
    var options = {select, where, category, headers, geoPosition,
      timePosition, measuresSelect, time, sort};
    var actions = [ cb => cb(null, options) ];

    // ?select=geo,time,population&geo=afr,chn&time=1800,1950:2000,2015&geo.cat=country,region
    switch (true) {
      // /api/geo
      case (isGeoPropsReq):
        actions.push(getGeoProperties, prepareGeoResponse);
        break;
      // ?select=geo,time
      case (!measuresSelect.length):
        options.select = ['geo'];
        actions.push(getGeoProperties, makeFlattenGeoProps, doCartesianProductOfGeoTime);
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

      req.wsJson = result;
      return next();
    });
  }

  function getMeasures(pipe, cb) {
    var resolvedGeos = pipe.resolvedGeos;

    // do measures request
    // prepare cypher query
    var reqWhere = 'WHERE i1.gid in ' + JSON.stringify(pipe.measuresSelect);

    if (pipe.where.time && pipe.where.time.length) {
      reqWhere += ' and ( ' + _.map(pipe.where.time, time => {
        if (time.length) {
          return `( dv1.value>="${time[0]}" and dv1.value<="${time[1]}" )`;
        }
        return `dv1.value="${time}"`;
      }).join(' or ') + ' )';
    }

    var dim1 = 'year';
    var dim2 = 'country';
    var match =
      `MATCH (i1:Indicators)-[:with_dimension]->(:Dimensions{gid: '${dim1}'})-[:with_dimension_value]->(dv1:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues),
        (i1:Indicators)-[:with_dimension]->(:Dimensions{gid: '${dim2}'})-[:with_dimension_value]->(dv2:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues)`;

    var returner = `RETURN collect(i1.gid) as indicator,dv1.value as year, dv2.value as country, collect(iv1.value) as value`;

    let sort = sortParamToCypher(pipe.sort, {geo: 'dv2.value', time: 'dv1.value'});

    var reqQuery = [match, reqWhere, returner, sort].join(' ');

    console.time('cypher');

    neo4jdb.cypherQuery(reqQuery, function (err, resp) {
      logger.debug('NEO4J QUERY: \n%s%s', config.LOG_TABS, reqQuery);
      console.timeEnd('cypher');
      if (err) {
        logger.error('ERROR: %s',  err);
        return cb(err);
      }

      console.time('format');
      var uniqTimeValues = new Set();
      var uniqGeoValues = new Set();
      var rows = _.reduce(resp.data, function (result, row) {
        var measuresValuesPosition = 3;
        var measuresNamesPosition = 0;

        var resRow = new Array(pipe.headers.length);
        // [indicators], year, country, [values]
        // time - year
        if (pipe.timePosition !== -1) {
          resRow[pipe.timePosition] = parseInt(row[1], 10);
          uniqTimeValues.add(row[1]);
        }
        // geo - country
        if (pipe.geoPosition !== -1) {
          resRow[pipe.geoPosition] = row[2];
          uniqGeoValues.add(row[2]);
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

      let columnsNum = resp.data && resp.data[0] ? resp.data[0].length : 0;
      let rowsNum = resp.data ? resp.data.length : 0;
      logger.debug('NEO4J ANSWER: \n%s%s/%s (columns/rows), %s (geos), %s (years)',
        config.LOG_TABS,
        columnsNum, rowsNum,
        uniqGeoValues.size,
        uniqTimeValues.size);
      console.timeEnd('format');
      return cb(null, {headers: pipe.headers, rows: rows});
    });
  }

  function sortParamToCypher(sortParam, dimensionsToCypherAliases) {
    let valuesWithOrdering = _.chain(sortParam)
      .keys()
      .reduce((result, dimension) => {
        result.push(`${dimensionsToCypherAliases[dimension]} ${sortParam[dimension]}`);
        return result;
      }, [])
      .value()
      .join(',');

    return valuesWithOrdering ? `ORDER BY ${valuesWithOrdering}` : '' ;
  }

  function getGeoProperties(pipe, cb) {
    let select = pipe.select;
    let where = pipe.where;

    return GeoPropCtrl.projectGeoProperties(select, where, function (err, geoData) {
      pipe.geoData = geoData;

      return cb(err, pipe);
    });
  }

  function prepareGeoResponse(pipe, cb) {
    return cb(null, {headers: pipe.geoData.headers, rows: pipe.geoData.rows});
  }

  function makeFlattenGeoProps(pipe, cb) {
    var resolvedGeos = _.chain(pipe.geoData.rows).flatten().compact().value();

    logger.debug('MONGODB GEO ANSWER: \n%s%s (geos)', config.LOG_TABS, resolvedGeos.length);

    pipe.resolvedGeos = resolvedGeos;
    return cb(null, pipe);
  }

  function doCartesianProductOfGeoTime(pipe, cb) {
    let headers = pipe.headers;
    let geoPosition = pipe.geoPosition;
    let timePosition = pipe.timePosition;
    let resolvedGeos = pipe.resolvedGeos;

    async.waterfall([
      (_cb) => {
        var query = {'dimensionGid': 'year'};
        if (pipe.where && pipe.where.time && pipe.where.time.length) {
          query.$or = _.map(pipe.where.time, time => {
            if (time.length) {
              return {'value': {$gte: time[0], $lte: time[1]}};
            }

            return {'value': time};
          });
        }

        DimensionValues.distinct('value', query)
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
              var result = new Array(headers.length);
              result[geoPosition] = geo;
              result[timePosition] = year;

              return result;
            });
          }).uniq(item => item.join(':')).flatten().value();

        return _cb(null, powerSet);
      }
    ], (err, rows) => {
      return cb(null, {headers: headers, rows: rows});
    });
  }
};
