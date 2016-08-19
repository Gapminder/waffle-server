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
 * @param subDatapointQuery
 * @param onDatapointsFound
 */
DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function(subDatapointQuery, onDatapointsFound) {
  const query = this._composeQuery(subDatapointQuery);

  return DataPoints.find(query).lean().exec(onDatapointsFound);
};
