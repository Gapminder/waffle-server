'use strict';

const _ = require('lodash');
const util = require('util');
const mongoose = require('mongoose');
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
 * @param measureIds
 * @param dimensionIds array of arrays, where each subarray is a collection of entities that relate to the same concept
 * @param onDatapointsFound
 */
DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function(subDatapointQuery, dimensionIds, onDatapointsFound) {
  const query = this._composeQuery({
    $or: subDatapointQuery,
    dimensions: {
      $size: _.size(dimensionIds),
      $all: _.map(dimensionIds, dimensionIdsPerConcept => {
        return {$elemMatch: {$in: dimensionIdsPerConcept}};
      })
    }
  });
  console.log(JSON.stringify(query));
  return DataPoints.find(query).lean().exec(onDatapointsFound);
};
