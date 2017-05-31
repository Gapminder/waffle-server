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
  private static toByDimensionsAndMeasureQuery(options: any): any {
    const {measureOriginId, dimensionsSize, dimensionsEntityOriginIds} = options;
    return {
      measure: measureOriginId,
      dimensions: {
        $size: dimensionsSize,
        $not: {$elemMatch: {$nin: dimensionsEntityOriginIds}}
      }
    };
  }

  public constructor(versionQueryFragment: any, datasetId?: any, version?: any) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return DataPoints;
  }

  public create(documents: any, onCreated?: Function): any {
    const documentsForStoring = Array.isArray(documents) ? documents : [documents];

    const executeDatapointsBulk = new Promise((resolve: any, reject: any) => {
      const bulk = mongoose.connection.collection('datapoints').initializeUnorderedBulkOp();
      documentsForStoring.forEach((document: any) => bulk.insert(this.setSingleDocumentId(document)));
      bulk.execute((error: string, response: any) => {
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });

    if (onCreated) {
      return executeDatapointsBulk
        .then((response: any) => onCreated(null, response))
        .catch((error: string) => onCreated(error));
    }
    return executeDatapointsBulk;
  }

  public count(onCounted: Function): any {
    const countQuery = this._composeQuery();
    return DataPoints.count(countQuery, onCounted as any);
  }

  public rollback(transaction: any, onRolledback: Function): void {
    const {createdAt: versionToRollback} = transaction;

    return async.parallelLimit([
      (done: Function) => DataPoints.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      (done: (err: any) => void) => DataPoints.remove({from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback as any);
  }

  public removeByDataset(datasetId: any, onRemove: Function): any {
    return DataPoints.remove({dataset: datasetId}, onRemove as any);
  }

  public removeByIds(ids: any, onRemove: (err: any) => void): any {
    return DataPoints.remove({_id: {$in: ids}}, onRemove);
  }

  public findIdsByDatasetAndLimit(datasetId: any, limit: any, onDatapointsFound: Function): Promise<Object> {
    const query = this._composeQuery({dataset: datasetId});

    logger.debug({mongo: query}, 'Datapoints query');
    return DataPoints.find(query, {_id: 1}).limit(limit).lean().exec(onDatapointsFound);
  }

  // FIXME: This should be used only for queries that came from normalizer!!!
  public findByQuery(subDatapointQuery: any, onDatapointsFound: Function): Promise<Object> {
    const query = this._composeQuery(subDatapointQuery);

    logger.debug({mongo: query}, 'Datapoints query');
    return DataPoints.find(query).lean().exec(onDatapointsFound);
  }

  public closeDatapointByMeasureAndDimensions(options: any, onDatapointClosed: Function): Promise<Object> {
    const numericDatapointValue = ddfImportUtils.toNumeric(options.datapointValue);
    const byDimensionsAndMeasureAndValueQuery = _.extend(DataPointsRepository.toByDimensionsAndMeasureQuery(options), {
      value: _.isNil(numericDatapointValue) ? options.datapointValue : numericDatapointValue
    });

    return this._closeOneByQuery(byDimensionsAndMeasureAndValueQuery, onDatapointClosed);
  }

  public closeOneByQuery(options: any, done: Function): Promise<Object> {
    const closingQuery = 'dimensionsEntityOriginIds' in options ? DataPointsRepository.toByDimensionsAndMeasureQuery(options) : options;
    return this._closeOneByQuery(closingQuery, done);
  }

  public findTargetForTranslation(options: any, done: Function): Promise<Object> {
    const query = this._composeQuery(DataPointsRepository.toByDimensionsAndMeasureQuery(options));
    return DataPoints.findOne(query).lean().exec(done);
  }

  public removeTranslation({originId, language}: any, done: (err: any) => void): any {
    return DataPoints.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
  }

  public addTranslation({id, language, translation}: any, done: (err: any) => void): any {
    return DataPoints.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {new: true}, done);
  }

  public addTranslationsForGivenProperties(properties: any, externalContext: any, done?: Function): Promise<any> {
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

  private _closeOneByQuery(closingQuery: any, done: Function): Promise<Object> {
    const query = this._composeQuery(closingQuery);
    return DataPoints
      .findOneAndUpdate(query, {$set: {to: this.version}}, {new: true})
      .lean()
      .exec(done);
  }
}

/* tslint:disable-next-line:max-classes-per-file */
class DatapointsRepositoryFactory extends VersionedModelRepositoryFactory<DataPointsRepository> {
  public constructor() {
    super(DataPointsRepository);
  }
}

const repositoryFactory = new DatapointsRepositoryFactory();
export { repositoryFactory as DatapointsRepositoryFactory };
