'use strict';
var async = require('async');
var _ = require('lodash');
var cache = require('express-redis-cache')();

var u = require('../utils');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var indicatorValues = serviceLocator.repositories.get('IndicatorValues');

  app.get('/api/admin/publisher/indicator-values/:versionId/:indicatorId',
    u.getCacheConfig('publisher-indicator-values'), cache.route(), getIndicatorValuesByVersion);
  app.get('/api/admin/indicator-values/:id',
    getIndicatorValue);
  app.post('/api/admin/indicator-values/:id',
    updateIndicatorValue);

  function getIndicatorValuesByVersion(req, res) {
    req.query.filter = req.params;
    return indicatorValues.getByVersion(req.query, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getIndicatorValue(req, res) {
    return indicatorValues.findById({
      id: req.params.id,
      projection: '_id indicator ds v'
    }, function (err, publisher) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: publisher});
    });
  }

  function updateIndicatorValue(req, res) {
    return indicatorValues.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }
};
