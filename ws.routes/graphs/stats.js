var _ = require('lodash');
var cache = require('express-redis-cache')();
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var compression = require('compression');

var ensureAuthenticated = require('../utils').ensureAuthenticated;

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var neo4jdb = app.get('neo4jDb');

  var query =
    "MATCH (i1:Indicators)-[:with_dimension]->(:Dimensions{name: 'year'})-[:with_dimension_value]->(dv1:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues), \
      (:Dimensions{name: 'country'})-[:with_dimension_value]->(dv2:DimensionValues)-[:with_indicator_value]->(iv1:IndicatorValues) \
    WHERE i1.name in ['pop', 'u5mr', 'gdp_per_cap', 'gini'] \
    RETURN collect(i1.name) as indicator,dv1.value as year, dv2.value as country, collect(iv1.value) as value";

  /*eslint new-cap:0*/
  var router = express.Router();

  router.get('/api/graphs/stats/vizabi-tools', compression(),  cache.route({expire: 300}),vizabiTools);

  return app.use(router);

  function vizabiTools(req, res, next) {
    var headers = ['year', 'country', 'pop', 'u5mr', 'gdp_per_cap', 'gini'];
    neo4jdb.cypherQuery(query, function (err, resp) {
      var rows = _.map(resp.data, function(row){
        var resRow = new Array(headers.length);
        // [indicators], year, country, [values]
        resRow[0] = row[1];
        resRow[1] = row[2];
        for (var i = 0; i < row[0].length; i++) {
          resRow[headers.indexOf(row[0][i])] = row[3][i];
        }
        return resRow;
      });
      return res.json({success: !err, data: {headers: headers, rows: rows}, error: err});
    });
  }
};
