'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');

module.exports = function (router) {
  var models = mongoose.modelNames();

  router.get('/collection/list', getCollectionList);

  router.get('/collection/:modelName', getSpecifiedCollection);

  function getCollectionList(req, res, next) {
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
  }

  function getSpecifiedCollection(req, res, next) {
    var modelName = req.params.modelName.charAt(0).toUpperCase() + req.params.modelName.slice(1);
    mongoose.model(modelName).find({}, function (err, data) {
      if (err) {
        return next(err);
      }

      console.log('Documents was found: ', data.length);
      return res.json({data: data});
    });
  }
};
