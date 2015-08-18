'use strict';

var mongoose = require('mongoose');
var async = require('async');

var PublisherCatalogVersions = mongoose.model('PublisherCatalogVersions');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');
var AnalysisSessions = mongoose.model('AnalysisSessions');
var ImportSessions = mongoose.model('ImportSessions');
var DimensionValues = mongoose.model('DimensionValues');
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
              return DimensionValues
                .distinct('dimension', {analysisSessions: {$in: analysisSessions}})
                .exec(function (err, data) {
                  return cb(err, data.length);
                });
            },
            indicators: function (cb) {
              return IndicatorValues
                .distinct('indicator', {analysisSessions: {$in: analysisSessions}})
                .exec(function (err, data) {
                  return cb(err, data.length);
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

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  PublisherCatalogVersionsRepository.prototype[actionName] =
    utils.actionFactory(actionName)(PublisherCatalogVersions, this);
});

module.exports = PublisherCatalogVersionsRepository;
