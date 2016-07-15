'use strict';

const _ = require('lodash');
const util = require('util');
const mongoose = require('mongoose');
const DataPoints = mongoose.model('DataPoints');

const utils = require('../../utils');

util.inherits(DataPointsRepository, utils.VersionedModelRepository);

function DataPointsRepository() {
  utils.VersionedModelRepository.apply(this, arguments);
}

module.exports = new utils.VersionedModelRepositoryFactory(DataPointsRepository);

/**
 *
 * @param measureIds
 * @param dimensionIds array of arrays, where each subarray is a collection of entities that relate to the same concept
 * @param onDatapointsFound
 */
DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function(measureIds, dimensionIds, onDatapointsFound) {
  const query = this._composeQuery({
    measure: {$in: measureIds},
    dimensions: {
      $size: _.size(dimensionIds),
      $all: _.map(dimensionIds, dimensionIdsPerConcept => {
        return {$elemMatch: {$in: dimensionIdsPerConcept}};
      })
    }
  });

  return DataPoints.find(query).lean().exec(onDatapointsFound);
};
