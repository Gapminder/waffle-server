'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var Dimensions = mongoose.model('Dimensions');
var Indicators = mongoose.model('Indicators');
var DataSources = mongoose.model('DataSources');
var ImportSessions = mongoose.model('ImportSessions');
var IndicatorValues = mongoose.model('IndicatorValues');
var AnalysisSessions = mongoose.model('AnalysisSessions');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');
var PublisherCatalogVersions = mongoose.model('PublisherCatalogVersions');

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
                .exec(cb);
            },
            indicators: function (cb) {
              return Indicators
                .count({analysisSessions: {$in: analysisSessions}})
                .exec(cb);
            },
            stats: function (cb) {
              return IndicatorValues
                .count({analysisSessions: {$in: analysisSessions}})
                .exec(cb);
            }
          },
          cb);
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
