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

DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function (subDatapointQuery, onDatapointsFound) {
  const query = this._composeQuery(subDatapointQuery);

  return DataPoints.find(query).lean().exec(onDatapointsFound);
};

DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function (subDatapointQuery, onDatapointsFound) {
  const query = this._composeQuery(subDatapointQuery);

  return DataPoints.find(query).lean().exec(onDatapointsFound);
};

DataPointsRepository.prototype.findForGivenMeasuresAndDimensions = function (subDatapointQuery, onDatapointsFound) {
  const query = this._composeQuery(subDatapointQuery);

  return DataPoints.find(query).lean().exec(onDatapointsFound);
};

DataPointsRepository.prototype.closeDatapointByMeasureAndDimensionsAndValue = function (options, onDatapointClosed) {
  const {measureOriginId, dimensionsSize, dimensionsEntityOriginIds, datapointValue} = options;

  const query = this._composeQuery({
    measure: measureOriginId,
    dimensions: {
      $size: dimensionsSize,
      $not: {$elemMatch: {$nin: dimensionsEntityOriginIds}}
    },
    value: _.toNumber(datapointValue)
  });

  return DataPoints.findOneAndUpdate(query, {$set: {to: this.version}}, {new: true})
    .lean()
    .exec(onDatapointClosed);
};

DataPointsRepository.prototype.addTranslationsForGivenProperties = function (properties, context, done) {
  const dimensionProperties = _.pick(properties, _.keys(context.dimensions));
  const measureProperties = _.pick(properties, _.keys(context.measures));

  const subDatapointQuery = {
    $or: getSubQueryFromMeasuresAndDimensions(measureProperties, dimensionProperties)
  };

  const query = this._composeQuery(subDatapointQuery);
  const updateQuery = {
    $set: {
      languages: {
        [context.language]: properties
      }
    }
  };

  return DataPoints.update(query, updateQuery, {multi: true}).exec(done);
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
    .project({
      measure: 1,
      value: 1,
      dimensionsMatched: {$setIsSubset: ['$dimensions', entityIds]}
    })
    .match({
      dimensionsMatched: true
    })
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

function prefixWithProperties(object) {
  return _.mapKeys(object, (value, property) => `properties.${property}`);
}

function getSubQueryFromMeasuresAndDimensions(measures, dimensions) {
  return _.map(measures, (measureValue, measureGid) => {
    const dimensionProperties = prefixWithProperties(dimensions);
    const measureSubQuery = getMeasureSubQueryFromMeasures(measures, measureGid);
    const measureProperties = prefixWithProperties(measureSubQuery);

    return _.assign({}, dimensionProperties, measureProperties);
  })
}

function getMeasureSubQueryFromMeasures(measures) {
  return _.mapValues(measures, () => ({$exists: true}))
}
