import * as _ from 'lodash';
import * as hi from 'highland';
import {logger} from '../ws.config/log';
import {config} from '../ws.config/config';
import {constants} from '../ws.utils/constants';
import * as fileUtils from '../ws.utils/file';
import * as ddfImportUtils from '../ws.import/utils/import-ddf.utils';
import {DatasetSchemaRepository} from '../ws.repository/ddf/dataset-index/dataset-index.repository';
import {DatapointsRepositoryFactory} from '../ws.repository/ddf/data-points/data-points.repository';

export {
  createDatasetSchema
}

function createDatasetSchema(externalContext: any, done: Function): void {
  const externalContextFrozen = Object.freeze({
    concepts: externalContext.concepts,
    datasetId: externalContext.dataset._id,
    transactionId: externalContext.transaction._id,
    version: externalContext.transaction.createdAt,
    pathToDdfFolder: externalContext.pathToDdfFolder,
    resources: externalContext.datapackage.resources
  });

  const resourcesStream = hi(externalContextFrozen.resources);

  const datasetSchemaCreationStream = hi([
    toConceptsSchemaCreationStream(resourcesStream, externalContextFrozen),
    toEntitiesSchemaCreationStream(resourcesStream, externalContextFrozen),
    toDatapointsSchemaCreationStream(resourcesStream, externalContextFrozen)
  ]).parallel(3);

  return ddfImportUtils.startStreamProcessing(datasetSchemaCreationStream, externalContext, done);
}

function toConceptsSchemaCreationStream(resourcesStream: any, externalContextFrozen: any): any {
  return resourcesStream.fork()
    .filter((resource: any) => resource.type === constants.CONCEPTS)
    .flatMap((resource: any) => {
      return fileUtils
        .readCsvFileAsStream(externalContextFrozen.pathToDdfFolder, resource.path)
        .map((csvRecord: any) => ({csvRecord, resource}));
    })
    .map(({csvRecord, resource}: any) => {
      return {
        key: resource.primaryKey,
        value: csvRecord[resource.primaryKey],
        file: [resource.path],
        type: constants.CONCEPTS,
        dataset: externalContextFrozen.datasetId,
        transaction: externalContextFrozen.transactionId
      };
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((datasetSchemaBatch: any[]) => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function toEntitiesSchemaCreationStream(resourcesStream: any, externalContextFrozen: any): any {
  return resourcesStream.fork()
    .filter((resource: any) => resource.type === constants.ENTITIES)
    .flatMap((resource: any) => hi(resource.fields).map((field: string) => ({field, resource})))
    .filter(({field, resource}: any) => field !== resource.concept)
    .map(({field, resource}: any) => {
      return {
        key: resource.concept,
        value: field,
        file: [resource.path],
        type: constants.ENTITIES,
        dataset: externalContextFrozen.datasetId,
        transaction: externalContextFrozen.transactionId
      };
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((datasetSchemaBatch: any[]) => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function toDatapointsSchemaCreationStream(resourcesStream: any, externalContextFrozen: any): any {
  return resourcesStream.fork()
    .filter((resource: any) => resource.type === constants.DATAPOINTS)
    .flatMap((resource: any) => {
      const schemaItemsExplodedByIndicator = _.reduce(resource.indicators, (result: any, indicator: any) => {
        const schemaItem = {
          key: resource.dimensions,
          value: indicator,
          file: [resource.path],
          type: constants.DATAPOINTS,
          dataset: externalContextFrozen.datasetId,
          transaction: externalContextFrozen.transactionId
        };
        result.push(schemaItem);
        return result;
      }, []);

      return hi(schemaItemsExplodedByIndicator);
    })
    .flatMap((schemaItem: any) => hi.wrapCallback(populateDatapointsSchemaItemWithOriginIds)(schemaItem, externalContextFrozen))
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .map((datasetSchemaBatch: any[]) => {
      return _.uniqWith(datasetSchemaBatch, (schemaItemA: any, schemaItemB: any) => {
        return _.isEqual(_.sortBy(schemaItemA.key), _.sortBy(schemaItemB.key))
          && schemaItemA.value === schemaItemB.value;
      });
    })
    .flatMap((datasetSchemaBatch: any[]) => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function storeDatasetSchemaItemsToDb(datasetSchemaItems: any[]): Promise<any> {
  logger.info('** create Dataset schema items: ', _.size(datasetSchemaItems));
  return DatasetSchemaRepository.create(datasetSchemaItems);
}

function populateDatapointsSchemaItemWithOriginIds(index: any, externalContext: any, done: Function): void {
  logger.info('** populate Dataset Index with originIds');

  const getOriginIdCurried = _.curry(getOriginId)(externalContext.concepts);
  index.keyOriginIds = _.chain(index.key).map(getOriginIdCurried).compact().value();
  index.valueOriginId = getOriginIdCurried(index.value);

  if (!config.CALCULATE_SCHEMA_QUERIES_AGG_FUNCTIONS) {
    return done(null, index);
  }

  const context = {datasetId: externalContext.datasetId, version: externalContext.version, index};
  return findDatapointsStatsForMeasure(context, done);
}

function findDatapointsStatsForMeasure(externalContext: any, done: Function): void {
  logger.info(`** find Datapoints stats for Measure ${_.get(externalContext.index, 'value')}`);

  const options = {
    measureId: externalContext.index.valueOriginId,
    dimensionsConceptsIds: externalContext.index.keyOriginIds,
    dimensionsSize: _.size(externalContext.index.key)
  };

  return DatapointsRepositoryFactory.currentVersion(externalContext.datasetId, externalContext.version)
    .findStats(options, (error: any, stats: any) => {
      if (error) {
        return done(error);
      }

      const normalizedStats = _.mapValues(stats, (val: string) => {
        if (_.isNumber(val)) {
          return parseFloat(val.toFixed(5));
        }
        return val;
      });

      return done(null, _.extend(externalContext.index, normalizedStats));
    });
}

function getOriginId(concepts: any, key: string): any {
  return _.get(concepts, `${key}.originId`, null);
}
