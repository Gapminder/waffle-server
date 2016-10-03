'use strict';

const _ = require('lodash');
const util = require('util');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const DataPoints = mongoose.model('DataPoints');

const RepositoryFactory = require('../../repository.factory');
const repositoryModel = require('../../repository.model');

util.inherits(DataPointsRepository, repositoryModel);

function DataPointsRepository() {
  repositoryModel.apply(this, arguments);
}

module.exports = new RepositoryFactory(DataPointsRepository);

/**
 *
 * @param subDatapointQuery
 * @param onDatapointsFound
 */
DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function(subDatapointQuery, onDatapointsFound) {
  const query = this._composeQuery(subDatapointQuery);

  return DataPoints.find(query).lean().exec(onDatapointsFound);
};

DataPointsRepository.prototype.findStats = function (params, onDatapointsFound) {
  const measureId = ObjectId(params.measureId);
  const entityIds = _.map(params.entityIds, id => ObjectId(id));
  const dimensionsSize = params.dimensionsSize;

  const query = this._composeQuery({
    measure: measureId,
    dimensions: {
      $size: dimensionsSize,
      $in: entityIds
    }
  });

  return DataPoints.aggregate()
    .match(query)
    .group({
      _id: '$measure',
      min: {$min: '$value'},
      max: {$max: '$value'},
      avg: {$avg: '$value'}
    }).exec((error, stats) => {
      if (error) {
        return onDatapointsFound(error);
      }

      return onDatapointsFound(null, _.head(stats));
    });
};

