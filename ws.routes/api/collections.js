'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var models = mongoose.modelNames();

  app.get('/api/admin/collections/list', getCollectionList);

  app.get('/api/admin/collections/:modelName', getSpecifiedCollection);

  function getCollectionList(req, res, next) {
    async.map(models, function (item, cb) {
      mongoose.model(item).count({}, function (err, count) {
        if (err) {
          return cb(err);
        }

        var fields = _.keys(_.omit(mongoose.model(item).schema.paths, ['__v', '_id']));
        return cb(null, {name: item, fields: fields, count: count});
      });
    }, function (err, result) {
      if (err) {
        return next(err);
      }

      return res.json({success: true, data: result, totalItems: models.length});
    });
  }

  function getSpecifiedCollection(req, res, next) {
    var modelName = req.params.modelName.charAt(0).toUpperCase() + req.params.modelName.slice(1);
    var limit = req.query.limit || 1000;
    var skip = req.query.skip || 0;

    mongoose.model(modelName).find({},
      {analysisSessions: false, importSessions: false, __v: false},
      {skip: skip, limit: limit}, function (err, data) {
        if (err) {
          return next(err);
        }

        mongoose.model(modelName).count({}, function (_err, totalItems) {
          if (_err) {
            return next(_err);
          }

          console.log('Documents was found: ', data.length);
          return res.json({success: true, data: data, totalItems: totalItems});
        });
      });
  }
};
