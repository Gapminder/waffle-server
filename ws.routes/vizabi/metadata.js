'use strict';

var express = require('express');
var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../utils');
var controller = require('./metadata.service');


module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var router = express.Router();

  router.get('/api/meta',
   compression(), u.getCacheConfig('metadata'), cache.route(), u.decodeQuery, sendMetadata
  );

  return app.use(router);
};
function sendMetadata(req, res) {
  controller.projectMetadata(req.decodedQuery.select, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    return res.json(result);
  });
}