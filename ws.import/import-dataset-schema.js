'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');

const logger = require('../ws.config/log');
const config = require('../ws.config/config');
const constants = require('../ws.utils/constants');
const fileUtils = require('../ws.utils/file');
const ddfImportUtils = require('../ws.import/utils/import-ddf.utils');
const datasetSchemaRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');

module.exports = (externalContext, done) => {
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
};

function toConceptsSchemaCreationStream(resourcesStream, externalContextFrozen) {
  return resourcesStream.fork()
    .filter(resource => resource.type === constants.CONCEPTS)
    .flatMap(resource => {
      return fileUtils
        .readCsvFileAsStream(externalContextFrozen.pathToDdfFolder, resource.path)
        .map(csvRecord => ({csvRecord, resource}));
    })
    .map(({csvRecord, resource}) => {
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
    .flatMap(datasetSchemaBatch => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function toEntitiesSchemaCreationStream(resourcesStream, externalContextFrozen) {
  return resourcesStream.fork()
    .filter(resource => resource.type === constants.ENTITIES)
    .flatMap(resource => hi(resource.fields).map(field => ({field, resource})))
    .filter(({field, resource}) => field !== resource.concept)
    .map(({field, resource}) => {
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
    .flatMap(datasetSchemaBatch => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function toDatapointsSchemaCreationStream(resourcesStream, externalContextFrozen) {
  return resourcesStream.fork()
    .filter(resource => resource.type === constants.DATAPOINTS)
    .flatMap(resource => {
      const schemaItemsExplodedByIndicator = _.reduce(resource.indicators, (result, indicator) => {
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
    .flatMap(schemaItem => hi.wrapCallback(populateDatapointsSchemaItemWithOriginIds)(schemaItem, externalContextFrozen))
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .map(datasetSchemaBatch => {
      return _.uniqWith(datasetSchemaBatch, (schemaItemA, schemaItemB) => {
        return _.isEqual(_.sortBy(schemaItemA.key), _.sortBy(schemaItemB.key))
          && schemaItemA.value === schemaItemB.value;
      });
    })
    .flatMap(datasetSchemaBatch => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function storeDatasetSchemaItemsToDb(datasetSchemaItems) {
  logger.info('** create Dataset schema items: ', _.size(datasetSchemaItems));
  return datasetSchemaRepository.create(datasetSchemaItems);
}

function populateDatapointsSchemaItemWithOriginIds(index, externalContext, done) {
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

function findDatapointsStatsForMeasure(externalContext, done) {
  logger.info(`** find Datapoints stats for Measure ${_.get(externalContext.index, 'value')}`);

  const options = {
    measureId: externalContext.index.valueOriginId,
    dimensionsConceptsIds: externalContext.index.keyOriginIds,
    dimensionsSize: _.size(externalContext.index.key)
  };

  return datapointsRepositoryFactory.currentVersion(externalContext.datasetId, externalContext.version)
    .findStats(options, (error, stats) => {
      if (error) {
        return done(error);
      }

      const normalizedStats = _.mapValues(stats, val => {
        if (_.isNumber(val)) {
          return parseFloat(val.toFixed(5), 10);
        }
        return val;
      });

      return done(null, _.extend(externalContext.index, normalizedStats));
    });
}

function getOriginId(concepts, key) {
  return _.get(concepts, `${key}.originId`, null);
}
