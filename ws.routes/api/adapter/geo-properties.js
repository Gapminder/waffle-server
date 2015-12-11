var express = require('express');
var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../../utils');
var controller = require('./geo-properties.controller');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  // lists
  router.get('/api/geo/', compression(), u.getCacheConfig('geo'), cache.route(), function (req, res) {
      controller.listGeoProperties(function (err, result) {
      return res.json({success: !err, data: result, error: err});
    });
  });
  router.get('/api/geo/regions', compression(), u.getCacheConfig('regions'), cache.route(), function (req, res) {
    controller.listRegionsProperties(function (err, result) {
      return res.json({success: !err, data: result, error: err});
    });
  });
  router.get('/api/geo/countries', compression(), u.getCacheConfig('countries'), cache.route(), function (req, res) {
    controller.listCountriesProperties(function (err, result) {
      return res.json({success: !err, data: result, error: err});
    });
  });

  return app.use(router);
};
