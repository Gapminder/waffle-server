'use strict';
var async = require('async');
var _ = require('lodash');
var cache = require('express-redis-cache')();

var u = require('../utils');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var dimensionValues = serviceLocator.repositories.get('DimensionValues');

  app.get('/api/admin/publisher/dimension-values/:versionId/:dimensionId',
    u.getCacheConfig('publisher-dimension-values'), cache.route(), getDimensionValuesByVersion);
  app.get('/api/admin/dimension-values',
    u.getCacheConfig('dimension-values'), cache.route(), getDimensionValues);
  app.get('/api/admin/dimension-values/:id',
    getDimensionValue);
  app.post('/api/admin/dimension-values/:id',
    updateDimensionValue);

  function getDimensionValuesByVersion(req, res) {
    req.query.filter = req.params;
    return dimensionValues.getByVersion(req.query, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getDimensionValues(req, res) {
    return dimensionValues.pagedList(req.params, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getDimensionValue(req, res) {
    return dimensionValues.findById({
      id: req.params.id,
      projection: '_id dimension value'
    }, function (err, publisher) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: publisher});
    });
  }

  function updateDimensionValue(req, res) {
    return dimensionValues.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }
};
