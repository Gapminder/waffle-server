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
    controller.parseQueryParams, controller.sendGeoResponse
  );

  router.get('/api/geo/:category',
    compression(), u.getCacheConfig('geo-category'), cache.route(),
    controller.parseQueryParams, controller.sendGeoResponse
  );

  return app.use(router);

};
