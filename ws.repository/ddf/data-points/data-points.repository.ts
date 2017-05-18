import * as _ from 'lodash';
import * as async from 'async';
import { logger } from '../../../ws.config/log';

import * as mongoose from 'mongoose';

import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import { VersionedModelRepositoryFactory } from '../../versioned-model-repository-factory';
import { VersionedModelRepository } from '../../versioned-model-repository';
import { constants } from '../../../ws.utils/constants';

const DataPoints = mongoose.model('DataPoints');

class DataPointsRepository extends VersionedModelRepository {
  public constructor(versionQueryFragment, datasetId?, version?) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return DataPoints;
  }

  public create(documents: any, onCreated?: Function): any {
    const documentsForStoring = Array.isArray(documents) ? documents : [documents];

    const executeDatapointsBulk = new Promise((resolve, reject) => {
      const bulk = mongoose.connection.collection('datapoints').initializeUnorderedBulkOp();
      documentsForStoring.forEach((document: any) => bulk.insert(this.setSingleDocumentId(document)));
      bulk.execute((error, response) => {
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });

    if (onCreated) {
      return executeDatapointsBulk
        .then((response: any) => onCreated(null, response))
        .catch((error: any) => onCreated(error));
    }
    return executeDatapointsBulk;
  }

  public count(onCounted) {
    const countQuery = this._composeQuery();
    return DataPoints.count(countQuery, onCounted);
  }

  public rollback(transaction, onRolledback) {
    const {createdAt: versionToRollback} = transaction;

    return async.parallelLimit([
      done => DataPoints.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      done => DataPoints.remove({from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
  }

  public removeByDataset(datasetId, onRemove) {
    return DataPoints.remove({dataset: datasetId}, onRemove);
  }


  public removeByIds(ids, onRemove) {
    return DataPoints.remove({_id: {$in: ids}}, onRemove);
  }

  public findIdsByDatasetAndLimit(datasetId, limit, onDatapointsFound) {
    const query = this._composeQuery({dataset: datasetId});

    logger.debug({obj: query}, 'Datapoints query');
    return DataPoints.find(query, {_id: 1}).limit(limit).lean().exec(onDatapointsFound);
  }

  //FIXME: This should be used only for queries that came from normalizer!!!
  public findByQuery(subDatapointQuery, onDatapointsFound) {
    const query = this._composeQuery(subDatapointQuery);

    logger.debug({obj: query}, 'Datapoints query');
    return DataPoints.find(query).lean().exec(onDatapointsFound);
  }

  public closeDatapointByMeasureAndDimensions(options, onDatapointClosed) {
    const numericDatapointValue = ddfImportUtils.toNumeric(options.datapointValue);
    const byDimensionsAndMeasureAndValueQuery = _.extend(DataPointsRepository.toByDimensionsAndMeasureQuery(options), {
      value: _.isNil(numericDatapointValue) ? options.datapointValue : numericDatapointValue
    });

    return this._closeOneByQuery(byDimensionsAndMeasureAndValueQuery, onDatapointClosed);
  }

  public closeOneByQuery(options, done) {
    const closingQuery = 'dimensionsEntityOriginIds' in options ? DataPointsRepository.toByDimensionsAndMeasureQuery(options) : options;
    return this._closeOneByQuery(closingQuery, done);
  }

  public findTargetForTranslation(options, done) {
    const query = this._composeQuery(DataPointsRepository.toByDimensionsAndMeasureQuery(options));
    return DataPoints.findOne(query).lean().exec(done);
  }

  public removeTranslation({originId, language}, done) {
    return DataPoints.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {'new': true}, done);
  }

  public addTranslation({id, language, translation}, done) {
    return DataPoints.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {'new': true}, done);
  }

  public addTranslationsForGivenProperties(properties, externalContext, done?) {
    const {source, language, resolvedProperties} = externalContext;

    const subDatapointQuery = _.extend({sources: source}, resolvedProperties);

    const query = this._composeQuery(subDatapointQuery);
    const updateQuery = {
      $set: {
        languages: {
          [language.id]: properties
        }
      }
    };

    return DataPoints.update(query, updateQuery, {multi: true}).exec(done);
  }

  private _closeOneByQuery(closingQuery, done) {
    const query = this._composeQuery(closingQuery);
    return DataPoints
      .findOneAndUpdate(query, {$set: {to: this.version}}, {'new': true})
      .lean()
      .exec(done);
  }

  private static toByDimensionsAndMeasureQuery(options) {
    const {measureOriginId, dimensionsSize, dimensionsEntityOriginIds} = options;
    return {
      measure: measureOriginId,
      dimensions: {
        $size: dimensionsSize,
        $not: {$elemMatch: {$nin: dimensionsEntityOriginIds}}
      }
    }
  }
}

class DatapointsRepositoryFactory extends VersionedModelRepositoryFactory<DataPointsRepository> {
  public constructor() {
    super(DataPointsRepository);
  }
}

const repositoryFactory = new DatapointsRepositoryFactory();
export { repositoryFactory as DatapointsRepositoryFactory };
