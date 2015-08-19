'use strict';

var mongoose = require('mongoose');
var async = require('async');

var Dimensions = mongoose.model('Dimensions');
var DimensionValues = mongoose.model('DimensionValues');

var utils = require('../utils');

function DimensionsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  DimensionsRepository.prototype[actionName] = utils.actionFactory(actionName)(Dimensions, this);
});

DimensionsRepository.prototype.getByVersion = function getByVersion(params, cb) {
  return utils.getActualAnalysisSessions({versionId: params.versionId},
    function (err, analysisSessions) {
      if (err) {
        return cb(err);
      }

      return Dimensions
        .find({analysisSessions: {$in: analysisSessions}}, '_id name')
        .lean()
        .exec(function (err, dimensions) {

          function prepareCount(dimension) {
            return function (cb) {
              DimensionValues.count({
                dimension: dimension._id,
                analysisSessions: {
                  $in: analysisSessions
                }
              }, function (err, count) {
                dimension.values = count;
                return cb(err);
              });
            }
          }

          var actions = [];
          dimensions.forEach(function (dimension) {
            actions.push(prepareCount(dimension));
          });

          return async.parallel(actions, function (err) {
            return cb(err, dimensions);
          });
        });
    }
  );
};

module.exports = DimensionsRepository;
