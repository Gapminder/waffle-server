'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');

module.exports = function (app, serviceLocator) {
  function getIndicators () {
  }

  function getIndicator () {
  }

  function getIndicatorValues () {
  }

  function getIndicatorVersions () {
  }
  // redirect to list of indicators
  app.get('/', function (req, res) {
    return res.redirect('/api/lastVersion/indicators');
  });

  // returns list of indicators
  app.get('/:version/indicators', getIndicators);
  // returns indicator meta
  app.get('/:version/indicators/:name', getIndicator);
  // returns indicator values, latest version or specific version
  app.get('/:version/indicators/:name/values', getIndicatorValues);
  // returns indicator versions
  app.get('/:version/indicators/:name/versions', getIndicatorVersions);

  var models = mongoose.modelNames();

  _.each(models, function (modelName) {
    app.get('/api/collection/' + modelName.toLowerCase(), function (req, res, next) {
      mongoose.model(modelName).find({}, function (err, data) {
        if (err) {
          return next(err);
        }

        return res.json({data: data});
      });
    });
  });

  app.get('/api/collection/list', function (req, res, next) {
    async.map(models, function (item, cb) {
      mongoose.model(item).count({}, function (err, count) {
        if (err) {
          return cb(err);
        }

        return cb(null, {name: item, fields: _.keys(mongoose.model(item).schema.paths), count: count});
      });
    }, function (err, result) {
      if (err) {
        return next(err);
      }

      return res.json({data: result});
    });
  });
};
