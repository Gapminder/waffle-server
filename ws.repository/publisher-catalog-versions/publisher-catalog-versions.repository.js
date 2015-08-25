'use strict';

var mongoose = require('mongoose');
var async = require('async');

var PublisherCatalogVersions = mongoose.model('PublisherCatalogVersions');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');
var AnalysisSessions = mongoose.model('AnalysisSessions');
var ImportSessions = mongoose.model('ImportSessions');
var Dimensions = mongoose.model('Dimensions');
var Indicators = mongoose.model('Indicators');
var IndicatorValues = mongoose.model('IndicatorValues');

var utils = require('../utils');

function PublisherCatalogVersionsRepository() {
}

PublisherCatalogVersionsRepository.prototype.detailsCounts =
  function detailsCounts(params, cb) {
    return utils.getActualAnalysisSessions({versionId: params.versionId},
      function (err, analysisSessions) {
        return async.parallel({
            dimensions: function (cb) {
              return Dimensions
                .count({analysisSessions: {$in: analysisSessions}})
                .exec(function (err, count) {
                  return cb(err, count);
                });
            },
            indicators: function (cb) {
              return Indicators
                .count({analysisSessions: {$in: analysisSessions}})
                .exec(function (err, count) {
                  return cb(err, count);
                });
            },
            stats: function (cb) {
              return IndicatorValues
                .count({analysisSessions: {$in: analysisSessions}})
                .exec(function (err, count) {
                  return cb(err, count);
                });
            }
          },
          function (err, results) {
            return cb(err, {
              dimensions: results.dimensions,
              indicators: results.indicators,
              stats: results.stats
            });
          }
        );
      });
  };

PublisherCatalogVersionsRepository.prototype.countByPublisher =
  function countByPublisher(params, cb) {
    return PublisherCatalogVersions
      .count({publisher: params.publisherId})
      .exec(function (err, count) {
        return cb(err, count);
      });
  };

PublisherCatalogVersionsRepository.prototype.lastVersionByPublisher =
  function lastVersionByPublisher(params, cb) {
    return PublisherCatalogVersions.aggregate([
      {
        $match: {
          'publisher': mongoose.Types.ObjectId(params.publisherId)
        }
      },
      {
        $group: {
          '_id': '$catalog',
          version: {
            $last: '$_id'
          },
          versions: {
            $push: {
              _id: '$_id',
              name: '$version'
            }
          }
        }
      }
    ], function (err, result) {
      return PublisherCatalogs.populate(result, {path: '_id'}, function (err, _result) {
        return cb(err, _result);
      });
    });
  };

['pagedList', 'update', 'deleteRecord'].forEach(function (actionName) {
  PublisherCatalogVersionsRepository.prototype[actionName] =
    utils.actionFactory(actionName)(PublisherCatalogVersions, this);
});

PublisherCatalogVersionsRepository.prototype.findById =
  utils.actionFactory('findById')(PublisherCatalogVersions, this,
    [{path: 'publisher', select: 'name'}, {path: 'catalog', select: 'name'}]);

module.exports = PublisherCatalogVersionsRepository;
