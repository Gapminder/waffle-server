var _ = require('lodash');
var cache = require('express-redis-cache')();
var cors = require('cors');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var compression = require('compression');
var GeoPropCtrl = require('../api/adapter/geo-properties.controller');
var md5 = require('md5');

var ensureAuthenticated = require('../utils').ensureAuthenticated;
//var getCacheConfig = require('../utils').getCacheConfig;

// HARDCODE: to remove, after splitting routes
function cacheConfigMiddleware() {
  return function (req, res, next) {
    var prefix;
    var referer = req.headers.referer || '';

    switch(true) {
      case /map/.test(referer):
        req.chartType = 'map';
        break;
      case /mountain/.test(referer):
        req.chartType = 'mountain';
        break;
      case /bubbles/.test(referer):
      default:
        req.chartType = 'bubbles';
        break;
    }
    prefix = req.chartType;

    /*eslint camelcase:0*/
    if (req.query.force === true) {
      res.use_express_redis_cache = false;
      return next();
    }

    var hash = md5(prefix + '-' + req.method + req.url);
    res.express_redis_cache_name = hash;
    next();
  };
};

var Geo = mongoose.model('Geo');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var neo4jdb = app.get('neo4jDb');

  var match =
    "MATCH (i1:Indicators)-[:with_dimension]->(:Dimensions{name: 'year'})-[:with_dimension_value]->(dv1:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues), \
      (i1:Indicators)-[:with_dimension]->(:Dimensions{name: 'country'})-[:with_dimension_value]->(dv2:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues)";
  var returner = "RETURN collect(i1.name) as indicator,dv1.value as year, dv2.value as country, collect(iv1.value) as value";

  /*eslint new-cap:0*/
  var router = express.Router();

  router.get('/api/graphs/stats/vizabi-tools', cacheConfigMiddleware(), cors(), compression(), cache.route({expire: 86400}), vizabiTools);

  return app.use(router);

  function vizabiTools(req, res, next) {
    var select = (req.query.select || '').split(',');
    var getGeoProps = GeoPropCtrl.listGeoProperties;
    var filterNullData = (arr) => arr;
    var charType = req.chartType;
    var isNeededRealData = req.query.real === 'true';

    switch(charType) {
      case 'map':
        if (select.indexOf('geo.region') === -1) {
          // TODO: remove when geo props will extend data in Graph Reader
          if (isNeededRealData) {
            select.splice(select.length - 2, 2);
          }
        }
        getGeoProps = GeoPropCtrl.listCountriesProperties;
        filterNullData = isNeededRealData
          ? filterNullData
          : (arr) => {
            return _.filter(arr, row => _.every(row, value => !!value));
          };
        break;
      case 'mountain':
        getGeoProps = isNeededRealData ? getGeoProps : GeoPropCtrl.listCountriesProperties;
        filterNullData = isNeededRealData
          ? filterNullData
          : (arr) => {
          return _.filter(arr, row => _.every(row, value => !!value));
        };
        break;
      case 'bubbles':
      default:
        break;
    }
    select = _.all(select, v=>/^geo/.test(v)) || select;

    // some time later
    async.waterfall([
      (cb) => {
        if (select === true) {
          getGeoProps((err, geos) => {
            var header = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.lat', 'geo.lng'];
            var rows = _.map(geos, geo => _.map(header, column => geo[column]));
            var data = {
              headers: header,
              rows: filterNullData(rows)
            };

            return cb(err, data);
          });
          return;
        }
        // do measures request
        // prepare cypher query
        var measuresSelect = _.difference(select, ['geo', 'time']);
        if (!measuresSelect.length) {
          return cb(new Error('Please provide measures names in `select` query part'));
        }

        var reqWhere = 'WHERE i1.name in ' + JSON.stringify(measuresSelect);

        // TODO: HARDCODE - Filter gaps in data
	      if (!isNeededRealData) {
          reqWhere += ' and dv1.value>="1950"';
        }

        if (req.query.time) {
          var time = parseInt(req.query.time, 10);
          if (time) {
            reqWhere += ' and dv1.value="' + time + '"';
          } else {
            time = JSON.parse(req.query.time);
            reqWhere += [' and dv1.value>="', time.from, '" and dv1.value<="', time.to, '"'].join('');
          }
        }
        var reqQuery = [match, reqWhere, returner].join(' ');

        var headers = ['geo', 'time'].concat(measuresSelect);

        console.time('cypher');
        neo4jdb.cypherQuery(reqQuery, function (err, resp) {
          console.timeEnd('cypher');
          if (err) {
            return cb(err);
          }

          console.time('format');
          var rows = _.map(resp.data, function (row) {
            var resRow = new Array(headers.length);
            // [indicators], year, country, [values]
            // time - year
            resRow[1] = parseInt(row[1], 10);
            // geo - country
            resRow[0] = row[2];
            for (var i = 0; i < row[0].length; i++) {
              resRow[headers.indexOf(row[0][i])] = parseFloat(row[3][i]);
            }
            return resRow;
          });
          rows = (isNeededRealData) ? rows : _.sortBy(rows, '1');

          console.timeEnd('format');
          return cb(null, {headers: headers, rows: rows});
        });
      },
      function (data, cb) {
        if (select === true) {
          return cb(null, data);
        }

        getGeoProps((err, geos) => {
          if (err) {
            return cb(err);
          }

          var geoProps = _.indexBy(geos, 'geo');


          _.each(data.rows, row => {
            if (charType === 'map') {
              row.pop();
              row.pop();
              if (!isNeededRealData) {
                row.push(geoProps[row[0]]['geo.lat']);
                row.push(geoProps[row[0]]['geo.lng']);
                //
                //row.push(geoProps[row[0]]['geo.name']);
                //row.push(geoProps[row[0]]['geo.cat']);
                //row.push(geoProps[row[0]]['geo.region']);
              }
            }
          });

          data.rows = filterNullData(data.rows);
          //data.headers = data.headers.concat(['geo.name','geo.cat','geo.region']);
          return cb(null, data);
        });
      }
    ], (err, result) => {
      if (err) {
        console.error(err);
        res.use_express_redis_cache = false;
        return res.json({success: false, error: err});
      }
      return res.json({success: !err, data: result, error: err});
    });
  }
};
