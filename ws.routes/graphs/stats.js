var _ = require('lodash');
var cache = require('express-redis-cache')();
var cors = require('cors');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var compression = require('compression');
var listCountriesProperties = require('../api/adapter/geo-properties.controller').listCountriesProperties;

var ensureAuthenticated = require('../utils').ensureAuthenticated;
var getCacheConfig = require('../utils').getCacheConfig;

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

  router.get('/api/graphs/stats/vizabi-tools', getCacheConfig(), cors(), compression(), cache.route({expire: 86400}), vizabiTools);

  return app.use(router);

  function vizabiTools(req, res, next) {
    var query = req.query.select || '';
    if (req.query.select && req.query.select.match(/pop/)) {
      query = query.replace('pop', 'u5mr,gdp_pc,pop');
    }
    var select = query.split(',');
    select = _.all(select, v=>/^geo/.test(v)) || select;
    console.log(select);

    // some time later
    async.waterfall([
      //// parse query
      //cb => cb(null, query.split(',')),
      //// is geo properties request
      //(select, cb) => cb(null, _.all(select, v=>/^geo/.test(v)) || select),
      (cb) => {
        if (select === true) {
          listCountriesProperties((err, geos) => {
            var header = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.lat', 'geo.lng'];
            var data = {
              headers: header,
              rows: _.map(geos, geo => _.map(header, column => geo[column]))
            };
            console.log(data);
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

	      reqWhere += ' and dv1.value>="1950"';

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

        var headers = ['time', 'geo'].concat(measuresSelect);

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
            resRow[0] = parseInt(row[1], 10);
            // geo - country
            resRow[1] = row[2];
            for (var i = 0; i < row[0].length; i++) {
              resRow[headers.indexOf(row[0][i])] = parseFloat(row[3][i]);
            }
            return resRow;
          });
          console.timeEnd('format');
          return cb(null, {headers: headers, rows: rows});
        });
      },
      function (data, cb) {
        if (select === true) {
          return cb(null, data);
        }

        console.log(data)
        listCountriesProperties((err, geos) => {
          if (err) {
            return cb(err);
          }

          var geoProps = _.reduce(geos, (result, geo) => {
            result[geo.geo] = {'lat': geo['geo.lat'], 'lng': geo['geo.lng']};

            return result;
          }, {});

          _.each(data.rows, row => {
            row[row.length - 2] = geoProps[row[1]].lat;
            row[row.length - 1] = geoProps[row[1]].lng;
          });

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
