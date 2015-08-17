'use strict';

var mongoose = require('mongoose');

var PublisherCatalogVersions = mongoose.model('PublisherCatalogVersions');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');

var utils = require('../utils');

function PublisherCatalogVersionsRepository() {
}

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
