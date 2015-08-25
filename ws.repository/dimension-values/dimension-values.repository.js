'use strict';

var mongoose = require('mongoose');
var DimensionValues = mongoose.model('DimensionValues');

var utils = require('../utils');

function DimensionValuesRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  DimensionValuesRepository.prototype[actionName] =
    utils.actionFactory(actionName)(DimensionValues, this);
});

DimensionValuesRepository.prototype.getByVersion = function getByVersion(params, cb) {
  return utils.getActualAnalysisSessions({versionId: params.filter.versionId},
    function (err, analysisSessions) {
      if (err) {
        return cb(err);
      }

      return DimensionValuesRepository.prototype.pagedList({
        limit: params.limit,
        skip: params.skip,
        filter: {
          dimension: params.filter.dimensionId,
          analysisSessions: {
            $in: analysisSessions
          }
        },
        projection: '_id dimension value'
      }, function (err, data) {
        return cb(err, data);
      });
    }
  );
};

module.exports = DimensionValuesRepository;
