'use strict';

var express = require('express');
var compression = require('compression');
var cors = require('cors');

var u = require('../utils');
var service = require('./geo-properties.service');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  const cache = require('../../ws.utils/redis-cache')(app.get('config'));

  router.get('/api/geo',
    compression(), u.getCacheConfig('geo'), cors(), cache.route(),
    u.decodeQuery, sendGeoResponse
  );

  router.get('/api/geo/:category',
    compression(), u.getCacheConfig('geo-category'), cache.route(),
    u.decodeQuery, sendGeoResponse
  );

  return app.use(router);
};

function sendGeoResponse(req, res) {
  service.projectGeoProperties(req.decodedQuery.select, req.decodedQuery.where, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }

    return res.json(result);
  });
}
