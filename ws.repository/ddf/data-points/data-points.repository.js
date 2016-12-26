'use strict';

const _ = require('lodash');
const util = require('util');
const async = require('async');
const logger = require('../../../ws.config/log');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const DataPoints = mongoose.model('DataPoints');

const ddfImportUtils = require('../../../ws.import/utils/import-ddf.utils');
const RepositoryFactory = require('../../repository.factory');
const repositoryModel = require('../../repository.model');
const constants = require('../../../ws.utils/constants');

util.inherits(DataPointsRepository, repositoryModel);

function DataPointsRepository(... args) {
  repositoryModel.apply(this, args);
}

module.exports = new RepositoryFactory(DataPointsRepository);

DataPointsRepository.prototype._getModel = function() {
  return DataPoints;
};

DataPointsRepository.prototype.count = function (onCounted) {
  const countQuery = this._composeQuery();
  return DataPoints.count(countQuery, onCounted);
};

DataPointsRepository.prototype.rollback = function (transaction, onRolledback) {
  const {createdAt: versionToRollback} = transaction;

  return async.parallelLimit([
    done => DataPoints.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
    done => DataPoints.remove({from: versionToRollback}, done)
  ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
};

DataPointsRepository.prototype.removeByDataset = function (datasetId, onRemove) {
  return DataPoints.remove({dataset: datasetId}, onRemove)
};

//FIXME: This should be used only for queries that came from normalizer!!!
DataPointsRepository.prototype.findByQuery = function(subDatapointQuery, onDatapointsFound) {
  const query = this._composeQuery(subDatapointQuery);

  logger.debug({obj: query}, 'Datapoints query');
  return DataPoints.find(query).lean().exec(onDatapointsFound);
};

DataPointsRepository.prototype.findDistinctDimensionsByMeasure = function(measureId, done) {
  const query = this._composeQuery({measure: measureId});
  return DataPoints.distinct('dimensions', query).lean().exec(done);
};

DataPointsRepository.prototype.closeDatapointByMeasureAndDimensionsAndValue = function (options, onDatapointClosed) {
  const numericDatapointValue = ddfImportUtils.toNumeric(options.datapointValue);
  const byDimensionsAndMeasureAndValueQuery = _.extend(toByDimensionsAndMeasureQuery(options), {
    value: _.isNil(numericDatapointValue) ? options.datapointValue : numericDatapointValue
  });

  return this._closeOneByQuery(byDimensionsAndMeasureAndValueQuery, onDatapointClosed);
};

DataPointsRepository.prototype.closeOneByQuery = function (options, done) {
  const closingQuery = 'dimensionsEntityOriginIds' in options ? toByDimensionsAndMeasureQuery(options) : options;
  return this._closeOneByQuery(closingQuery, done);
};

DataPointsRepository.prototype.findTargetForTranslation = function (options, done) {
  const query = this._composeQuery(toByDimensionsAndMeasureQuery(options));
  return DataPoints.findOne(query).lean().exec(done);
};

DataPointsRepository.prototype.removeTranslation = function ({originId, language}, done) {
  return DataPoints.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
};

DataPointsRepository.prototype.addTranslation = function ({id, language, translation}, done) {
  return DataPoints.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {new: true}, done);
};

DataPointsRepository.prototype.addTranslationsForGivenProperties = function (properties, externalContext, done) {
  const {source, language, resolvedProperties} = externalContext;

  const subDatapointQuery =_.extend({sources: source}, resolvedProperties);

  const query = this._composeQuery(subDatapointQuery);
  const updateQuery = {
    $set: {
      languages: {
        [language.id]: properties
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

DataPointsRepository.prototype._closeOneByQuery = function (closingQuery, done) {
  const query = this._composeQuery(closingQuery);
  return DataPoints
    .findOneAndUpdate(query, {$set: {to: this.version}}, {new: true})
    .lean()
    .exec(done);
};

function toByDimensionsAndMeasureQuery(options) {
  const {measureOriginId, dimensionsSize, dimensionsEntityOriginIds} = options;
  return {
    measure: measureOriginId,
    dimensions: {
      $size: dimensionsSize,
      $not: {$elemMatch: {$nin: dimensionsEntityOriginIds}}
    }
  };
}
