'use strict';

const _ = require('lodash');
const fs = require('fs');
const async = require('async');
const ddfImportUtils = require('../ws.import/utils/import-ddf.utils');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');
const indexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');

const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');
const fileUtils = require('../ws.utils/file');

module.exports = createDatasetIndex;

function createDatasetIndex(pipe, done) {
  logger.info('start process Dataset Index');

  return async.waterfall([
    async.constant(pipe),
    _generateDatasetIndex,
    _convertDatasetIndexToModel,
    _populateDatasetIndexWithOriginIds,
    _createDatasetIndex
  ], (err) => done(err, pipe));
}

function _generateDatasetIndex(pipe, done) {

  logger.info('** generate Dataset Index');
  pipe.datasetIndex = [];

  return async.waterfall([
    async.constant(pipe),
    _generateDatasetIndexFromConcepts,
    _generateDatasetIndexFromEntities,
    _generateDatasetIndexFromDatapoints
  ], err => done(err, pipe));
}

function _generateDatasetIndexFromConcepts(pipe, done) {
  const {pathToDdfFolder, datapackage: {resources}, datasetIndex} = pipe;
  const conceptResources = _.filter(resources, resource => resource.type === constants.CONCEPTS);

  return async.mapLimit(conceptResources, constants.LIMIT_NUMBER_PROCESS, (conceptResource, completeSearchForConcepts) => {
      fileUtils.readCsvFile(pathToDdfFolder, conceptResource.path, {}, (err, res) => {

        if (err) {
          return completeSearchForConcepts(err);
        }

        const conceptKey = conceptResource.primaryKey;
        const datasetConceptsIndexes = _.reduce(res, (result, row) => {
          result.push({
            key: conceptKey,
            value: row[conceptKey],
            file: [conceptResource.path],
            type: constants.CONCEPTS
          });
          return result;
        }, []);

        pipe.datasetIndex = _.concat(datasetIndex, datasetConceptsIndexes);
        return completeSearchForConcepts(null, _.size(datasetConceptsIndexes));
      });
    },
    (err, conceptsIndexAmounts) => {
      logger.info('** loaded Dataset files Concepts: ' + _.sum(conceptsIndexAmounts));
      return done(err, pipe);
    }
  );
}

function _generateDatasetIndexFromEntities(pipe, done) {
  const entityResources = _.filter(pipe.datapackage.resources, resource => resource.type === constants.ENTITIES);

  return async.mapLimit(entityResources, constants.LIMIT_NUMBER_PROCESS, (entityResource, completeSearchForEntities) => {
      const entityName = entityResource.concept;

      const datasetEntitiesIndexes =
        _.chain(entityResource.fields)
        .reduce((result, column) => {
          if (column === entityName) return result;

          result.push({
            key: entityName,
            value: column,
            file: [entityResource.path],
            type: constants.ENTITIES
          });
          return result;
        }, [])
        .value();

      pipe.datasetIndex = _.concat(pipe.datasetIndex, datasetEntitiesIndexes);
      return completeSearchForEntities(null, _.size(datasetEntitiesIndexes));
    },
    (err, entityIndexAmounts) => {
      logger.info('** loaded Dataset files Entities: ' + _.sum(entityIndexAmounts));
      return done(err, pipe);
    }
  );
}

function _generateDatasetIndexFromDatapoints(pipe, done) {
  const datapointResources = _.filter(pipe.datapackage.resources, resource => resource.type === constants.DATAPOINTS);

  return async.eachLimit(datapointResources, constants.LIMIT_NUMBER_PROCESS,
    function (datapointResource, completeSearchForDatapoints) {


      const existedItem = pipe.datasetIndex.find(arrayItem => _.isEqual(_.sortBy(arrayItem.key), _.sortBy(datapointResource.dimensions)) && _.isEqual(_.sortBy(arrayItem.value), _.sortBy(datapointResource.indicators)));

      // check that item not exists
      if (existedItem) {
        existedItem.file.push(datapointResource.path);
      } else {
        pipe.datasetIndex.push({
          key: datapointResource.dimensions,
          value: datapointResource.indicators,
          file: [datapointResource.path],
          type: constants.DATAPOINTS
        });
      }
      return completeSearchForDatapoints();
    },
    err => {
      logger.info('** loaded Dataset files Datapoints');
      return done(err, pipe);
    }
  );
}

function _convertDatasetIndexToModel(pipe, done) {

  logger.info('** convert Dataset Index to model');

  return async.setImmediate(() => {
    pipe.datasetIndexes = _.map(pipe.datasetIndex, mapDdfIndexToWsModel(pipe));
    return done(null, pipe);
  });
}

function _populateDatasetIndexWithOriginIds(pipe, done) {
  logger.info('** populate Dataset Index with originIds');

  //TODO: This might be executed in parallel in future
  return async.mapSeries(pipe.datasetIndexes, (index, onIndexPopulated) => {
    const getOriginIdCurried = _.curry(getOriginId)(pipe.concepts);

    index.keyOriginIds = _.chain(index.key).map(getOriginIdCurried).compact().value();
    index.valueOriginId = getOriginIdCurried(getLast(index.value));

    const context = {dataset: pipe.dataset, transacton: pipe.transaction, version: pipe.transaction.createdAt, index};
    return findDatapointsStatsForMeasure(context, onIndexPopulated);
  }, (error, populatedDatasetIndexes) => {
    if (error) {
      return done(error);
    }

    pipe.datasetIndexes = populatedDatasetIndexes;
    return done(null, pipe);
  });
}

function findDatapointsStatsForMeasure(pipe, done) {
  logger.info(`** find Datapoints stats for Measure ${_.get(pipe.index, 'value')}`);

  if (pipe.index.type !== constants.DATAPOINTS) {
    return async.setImmediate(() => done(null, pipe.index));
  }

  const options = {
    measureId: pipe.index.valueOriginId,
    dimensionsConceptsIds: pipe.index.keyOriginIds,
    dimensionsSize: _.size(pipe.index.key)
  };

  return datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findStats(options, (error, stats) => {
      if (error) {
        return done(error);
      }

      _.merge(pipe.index, _.omit(stats, '_id'));
      return done(null, pipe.index);
    });
}

function getOriginId(concepts, key) {
  const concept = concepts[key];
  return concept ? concept.originId : null;
}

function _createDatasetIndex(pipe, done) {

  logger.info('** create Dataset Index documents');

  return async.eachSeries(
    _.chunk(pipe.datasetIndexes, ddfImportUtils.DEFAULT_CHUNK_SIZE),
    indexRepository.create.bind(indexRepository),
    (err) => done(err, pipe)
  );
}

function mapDdfIndexToWsModel(pipe) {
  return function (item) {
    return {
      key: item.key,
      value: getLast(item.value),
      source: item.file || [],
      type: item.type,

      dataset: pipe.dataset._id,
      transaction: pipe.transaction._id
    };
  };
}

//FIXME: This is workaround to an issue when we have multiple indicators in datapoint file
// We cannot build MIN, MAX, AVG for files which contain datapoints with multiple indicators
function getLast(value) {
  return Array.isArray(value) ? _.last(value) : value;
}
