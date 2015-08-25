'use strict';

var mongoose = require('mongoose');
var async = require('async');

var Indicators = mongoose.model('Indicators');
var IndicatorValues = mongoose.model('IndicatorValues');

var utils = require('../utils');

function IndicatorsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  IndicatorsRepository.prototype[actionName] = utils.actionFactory(actionName)(Indicators, this);
});

IndicatorsRepository.prototype.getByVersion = function getByVersion(params, cb) {
  return utils.getActualAnalysisSessions({versionId: params.versionId},
    function (err, analysisSessions) {
      if (err) {
        return cb(err);
      }

      return Indicators
        .find({analysisSessions: {$in: analysisSessions}}, '_id name')
        .lean()
        .exec(function (err, indicators) {

          function prepareCount(indicator) {
            return function (cb) {
              IndicatorValues.count({
                indicator: indicator._id,
                analysisSessions: {
                  $in: analysisSessions
                }
              }, function (err, count) {
                indicator.values = count;
                return cb(err);
              });
            }
          }

          var actions = [];
          indicators.forEach(function (indicator) {
            actions.push(prepareCount(indicator));
          });

          return async.parallel(actions, function (err) {
            return cb(err, indicators);
          });
        });
    }
  );
};

module.exports = IndicatorsRepository;
