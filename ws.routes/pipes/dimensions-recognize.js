var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

var ensureAuthenticated = require('../utils').ensureAuthenticated;

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  var Dimensions = mongoose.model('Dimensions');
  var DimensionValues = mongoose.model('DimensionValues');

  router.post('/api/dimensions/recognize', ensureAuthenticated, function (req, res, next) {
    try {
      var keys = _.chain(req.body.keys)
        .map(function (k) {
          return k ? k.toString() : null;
        })
        .compact()
        .value();

      DimensionValues
        .find({
          $or: [
            {value: {$in: keys}},
            {title: {$in: keys}},
            {synonyms: {$in: keys}}
          ]
        }, {value: 1, title: 1, synonyms: 1, dimension: 1})
        .lean()
        .exec(function (err, dimensionValues) {
          if (err) {
            return next(err);
          }

          var dimensions = _.uniq(_.pluck(dimensionValues, 'dimension'), function (id) {
            return id.toString();
          });
          if (!dimensionValues || !dimensionValues.length || !dimensions || !dimensions.length) {
            return res.json({data: {msg: 'Unknown dimension!'}});
          }

          // hack: let us assume for now we have clean dimensions
          Dimensions.findOne({_id: dimensions[0]}, {_id: 1, name: 1, title: 1})
            .lean()
            .exec(function (err, dimension) {
              if (err) {
                return next(err);
              }
              var hashMap = buildHashMap(keys, dimensionValues);
              var notRecognized = buildNotRecognized(keys, hashMap);
              // todo: add unknown list
              return res.json({
                success: true, data: {
                  dimension: dimension,
                  hashMap: hashMap,
                  dimensionsCount: dimensions.length,
                  recognized: (dimensionValues.length / keys.length * 100).toFixed(2),
                  notRecognized: notRecognized
                }
              });
            });
        });
    } catch (e) {
      return next(e);
    }
  });

  return app.use(router);
};

function buildHashMap(keys, dimensionValues) {
  return _.reduce(dimensionValues, function (res, dimVal) {
    var nameIndex = keys.indexOf(dimVal.name);
    if (nameIndex !== -1) {
      res[keys[nameIndex]] = dimVal.value;
      return res;
    }

    var valueIndex = keys.indexOf(dimVal.value);
    if (valueIndex !== -1) {
      res[keys[valueIndex]] = dimVal.value;
      return res;
    }

    for (var i = 0; i < dimVal.synonyms.length; i++) {
      var synIndex = keys.indexOf(dimVal.synonyms[i]);
      if (synIndex === -1) {
        continue;
      }

      res[keys[synIndex]] = dimVal.value;
      return res;
    }
  }, {});
}

function buildNotRecognized(keys, hashMap) {

}
