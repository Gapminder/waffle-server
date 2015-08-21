'use strict';
var async = require('async');
var _ = require('lodash');
var cache = require('express-redis-cache')();

var u = require('../utils');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var indicators = serviceLocator.repositories.get('Indicators');

  app.get('/api/admin/publisher/indicators/:versionId',
    u.getCacheConfig('publisher-indicators'), cache.route(), getIndicatorsByVersion);
  app.get('/api/admin/indicators/:id',
    getIndicators);
  app.post('/api/admin/indicators/:id',
    updateIndicators);


  function getIndicatorsByVersion(req, res) {
    return indicators.getByVersion(req.params, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getIndicators(req, res) {
    return indicators.findById({
      id: req.params.id,
      projection: '_id name'
    }, function (err, indicator) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: indicator});
    });
  }

  function updateIndicators(req, res) {
    return indicators.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }
};
