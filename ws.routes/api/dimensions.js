'use strict';
var async = require('async');
var _ = require('lodash');
var cache = require('express-redis-cache')();

var u = require('../utils');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var dimensions = serviceLocator.repositories.get('Dimensions');

  app.get('/api/admin/publisher/dimensions/:versionId',
    u.getCacheConfig('publisher-dimensions'), cache.route(), getDimensionsByVersion);
  app.get('/api/admin/dimensions',
    u.getCacheConfig('dimensions'), cache.route(), getDimensions);
  app.get('/api/admin/dimensions/:id',
    getDimension);
  app.post('/api/admin/dimensions/:id',
    updateDimension);


  function getDimensionsByVersion(req, res) {
    return dimensions.getByVersion(req.params, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getDimensions(req, res) {
    return dimensions.pagedList(req.params, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getDimension(req, res) {
    return dimensions.findById({
      id: req.params.id,
      projection: '_id name'
    }, function (err, dimension) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: dimension});
    });
  }

  function updateDimension(req, res) {
    return dimensions.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }
};
