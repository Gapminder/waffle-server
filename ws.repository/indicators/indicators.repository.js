'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

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

      async.parallel({
        indicatorValuesHash: function (cb) {
          IndicatorValues.aggregate([
            {
              $match: {
                analysisSessions: {
                  $in: analysisSessions
                }
              }
            },
            {
              $group: {
                _id: '$indicator', count: {$sum: 1}
              }
            }
          ], function (err, result) {
            if (err) {
              return cb(err);
            }

            return cb(err, _.indexBy(result, '_id'));
          });
        },
        indicators: function (cb) {
          return Indicators
            .find({analysisSessions: {$in: analysisSessions}}, '_id name')
            .lean(true)
            .exec(cb);
        }
      }, function (err, result) {
        _.each(result.indicators, function (indicator){
          var counter = result.indicatorValuesHash[indicator._id.toString()];
          indicator.values = counter ? counter.count: 0;
        });
        return cb(err, result.indicators);
      });
    }
  );
};

module.exports = IndicatorsRepository;
