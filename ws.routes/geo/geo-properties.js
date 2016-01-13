'use strict';

var express = require('express');
var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../utils');
var controller = require('./geo-properties.controller');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  // lists
  router.get('/api/geo',
    compression(), u.getCacheConfig('geo'), cache.route(),
    u.decodeQuery, sendGeoResponse
  );

  router.get('/api/geo/:category',
    compression(), u.getCacheConfig('geo-category'), cache.route(),
    u.decodeQuery, sendGeoResponse
  );

  return app.use(router);
};

function sendGeoResponse(req, res) {
  controller.projectGeoProperties(req.decodedQuery.select, req.decodedQuery.where, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }

    return res.json(result);
  });
}
