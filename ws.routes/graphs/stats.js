var _ = require('lodash');
var cache = require('express-redis-cache')();
var cors = require('cors');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var compression = require('compression');
var md5 = require('md5');

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

  function vizabiTools(req, res) {
    var select = (req.query.select || '').split(',');

    // some time later
    async.waterfall([
      (cb) => {
        // do measures request
        // prepare cypher query
        var measuresSelect = _.difference(select, ['geo', 'time']);
        if (!measuresSelect.length) {
          return cb(new Error('Please provide measures names in `select` query part'));
        }

        var reqWhere = 'WHERE i1.name in ' + JSON.stringify(measuresSelect);

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

          console.timeEnd('format');
          return cb(null, {headers: headers, rows: rows});
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
