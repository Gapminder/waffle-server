import * as _ from 'lodash';
import * as util from 'util';
import * as async from 'async';
import { logger } from '../../../ws.config/log';

import { model } from 'mongoose';

import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import { RepositoryFactory } from '../../repository.factory';
import { RepositoryModel } from '../../repository.model';
import { constants } from '../../../ws.utils/constants';

const DataPoints = model('DataPoints');

util.inherits(DataPointsRepository, RepositoryModel);

function DataPointsRepository(... args) {
  RepositoryModel.apply(this, args);
}

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
  return DataPoints.remove({dataset: datasetId}, onRemove);
};

DataPointsRepository.prototype.removeByDatasetAndIds = function (datasetId, ids, onRemove) {
  return DataPoints.remove({dataset: datasetId, _id: {$in: ids}}, onRemove);
};

DataPointsRepository.prototype.removeByIds = function (ids, onRemove) {
  return DataPoints.remove({_id: {$in: ids}}, onRemove);
};

DataPointsRepository.prototype.findIdsByDatasetAndLimit = function(datasetId, limit, onDatapointsFound) {
  const query = this._composeQuery({dataset: datasetId});

  logger.debug({obj: query}, 'Datapoints query');
  return DataPoints.find(query, {_id: 1}).limit(limit).lean().exec(onDatapointsFound);
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
  return DataPoints.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {'new': true}, done);
};

DataPointsRepository.prototype.addTranslation = function ({id, language, translation}, done) {
  return DataPoints.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {'new': true}, done);
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

DataPointsRepository.prototype.findStats = function ({measureId, dimensionsSize, dimensionsConceptsIds}, onDatapointsFound) {
  const query = this._composeQuery({
    measure: measureId,
    dimensions: {
      $size: dimensionsSize
    },
    dimensionsConcepts: {
      $all: dimensionsConceptsIds
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

      return onDatapointsFound(null, _.omit(_.head(stats), '_id'));
    });
};

DataPointsRepository.prototype._closeOneByQuery = function (closingQuery, done) {
  const query = this._composeQuery(closingQuery);
  return DataPoints
    .findOneAndUpdate(query, {$set: {to: this.version}}, {'new': true})
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

const repositoryFactory = new RepositoryFactory(DataPointsRepository);

export { repositoryFactory as DatapointsRepositoryFactory };
