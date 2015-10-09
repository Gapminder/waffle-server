'use strict';

var _ = require('lodash');
var md5 = require('md5');
//var flatten = require('flat');

var cache = require('express-redis-cache')();
var compression = require('compression');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var db = app.get('neo4jDb');

  function cacheConfig(req, res, next) {
    /*eslint camelcase:0*/
    if (req.query.force === true) {
      res.use_express_redis_cache = false;
      return next();
    }
    // set cache name
    var hash = md5('cypher-' + req.method + req.url + req.body.query);
    console.log(hash);
    res.express_redis_cache_name = hash;
    next();
  }

  app.post('/api/admin/cyper', compression(), cacheConfig, cache.route(), runCyperQuery);

  function runCyperQuery(req, res) {
    var query = _.trim(req.body.query);

    if (!query) {
      return res.json({error: 'TypeError: Query or queries required', data: {data: {}}});
    }

    db.cypherQuery(query, {}, function (err, results) {
      if (err) {
        return res.json({error: err.message, data: {data: {}}});
      }

      return res.json({success: true, data: {data: results.data, columns: results.columns}});
    });
  }
};
