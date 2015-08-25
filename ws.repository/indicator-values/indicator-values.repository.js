'use strict';

var mongoose = require('mongoose');
var IndicatorValues = mongoose.model('IndicatorValues');

var utils = require('../utils');

function IndicatorValuesRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  IndicatorValuesRepository.prototype[actionName] =
    utils.actionFactory(actionName)(IndicatorValues, this);
});

IndicatorValuesRepository.prototype.getByVersion = function getByVersion(params, cb) {
  return utils.getActualAnalysisSessions({versionId: params.filter.versionId},
    function (err, analysisSessions) {
      if (err) {
        return cb(err);
      }

      return IndicatorValuesRepository.prototype.pagedList({
        limit: params.limit,
        skip: params.skip,
        filter: {
          indicator: params.filter.indicatorId,
          analysisSessions: {
            $in: analysisSessions
          }
        },
        projection: '_id indicator ds v'
      }, function (err, data) {
        return cb(err, data);
      });
    }
  );
};

module.exports = IndicatorValuesRepository;
