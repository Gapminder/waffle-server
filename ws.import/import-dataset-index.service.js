'use strict';

const _ = require('lodash');
const fs = require('fs');
const async = require('async');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository.js');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository.js');
const indexRepository = require('../ws.repository/ddf/dataset-index/dataset-index.repository');

const datapointUtils = require('./datapoints.utils');
const common = require('./common');
const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');

const entityOriginIdsCache = new Map();

module.exports = createDatasetIndex;

function createDatasetIndex(pipe, done) {
  logger.info('start process Dataset Index');

  return async.waterfall([
    async.constant(pipe),
    _loadDatasetFiles,
    _generateDatasetIndex,
    _convertDatasetIndexToModel,
    _populateDatasetIndexWithOriginIds,
    _createDatasetIndex
  ], (err) => {
    return done(err, pipe);
  });
}

function _loadDatasetFiles(pipe, done) {
  logger.info('** load Dataset files');

  fs.readdir(pipe.pathToDdfFolder, (err, _filenames) => {

    if (err) {
      return done(err);
    }

    pipe.datasetFilesByType = _.reduce(_filenames, (result, _filename) => {
      if (/^ddf--datapoints--/.test(_filename)) {
        result.datapoints.push(_filename);
      }
      if (/^ddf--entities--/.test(_filename)) {
        result.entities.push(_filename);
      }
      if (/^ddf--concepts/.test(_filename)) {
        result.concepts.push(_filename);
      }
      return result;
    }, {
      entities: [],
      concepts: [],
      datapoints: []
    });

    return done(null, pipe);
  });
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
  return async.mapLimit(
    pipe.filePaths[constants.CONCEPTS],
    constants.LIMIT_NUMBER_PROCESS,
    (file, completeSearchForConcepts) => {
      common.readCsvFile(file.path, {}, (err, res) => {

        if (err) {
          return completeSearchForConcepts(err);
        }

        const conceptKey = 'concept';
        const datasetConceptsIndexes = _.reduce(res, (result, row) => {
          result.push({
            key: conceptKey,
            value: row[conceptKey],
            file: [file.name],
            type: 'concepts'
          });
          return result;
        }, []);

        pipe.datasetIndex = _.concat(pipe.datasetIndex, datasetConceptsIndexes);
        return completeSearchForConcepts(null, _.size(datasetConceptsIndexes));
      });
    },
    (err, conceptsIndexAmounts) => {
      logger.info('** load Dataset files Concepts: ' + _.sum(conceptsIndexAmounts));
      return done(err, pipe);
    }
  );
}

function _generateDatasetIndexFromEntities(pipe, done) {
  return async.mapLimit(
    pipe.filePaths[constants.ENTITIES],
    constants.LIMIT_NUMBER_PROCESS,
    (file, completeSearchForEntities) => {
      common.readCsvFile(file.path, {}, (err, rows) => {

        if (err) {
          return completeSearchForEntities(err);
        }

        const entityFileHeader = _.first(rows);
        const entityName = _.first(file.schema.primaryKey);

        const datasetEntitiesIndexes = _.chain(entityFileHeader)
          .keys()
          .reduce((result, column) => {
            if (column !== entityName) {
              result.push({
                key: entityName,
                value: column,
                file: [file.name],
                type: 'entities'
              });
            }
            return result;
          }, []).value();

        pipe.datasetIndex = _.concat(pipe.datasetIndex, datasetEntitiesIndexes);
        return completeSearchForEntities(null, _.size(datasetEntitiesIndexes));
      });
    },
    (err, entityIndexAmounts) => {
      logger.info('** load Dataset files Entities: ' + _.sum(entityIndexAmounts));
      return done(err, pipe);
    }
  );
}

function _generateDatasetIndexFromDatapoints(pipe, done) {
  return async.forEachOfLimit(
    pipe.filePaths[constants.DATAPOINTS],
    constants.LIMIT_NUMBER_PROCESS,
    function (file, key, completeSearchForDatapoints) {

      const keyValuePair = getKeyValuePair(file);
      const existedItem = pipe.datasetIndex.find(arrayItem => arrayItem.key == keyValuePair.key && arrayItem.value == keyValuePair.value);

      // check that file not exists
      if (existedItem) {
        existedItem.file.push(file.name);
      } else {
        pipe.datasetIndex.push({
          key: keyValuePair.key,
          value: keyValuePair.value,
          file: [file.name],
          type: 'datapoints'
        });
      }
      return completeSearchForDatapoints();
    },
    err => {
      logger.info('** load Dataset files Datapoints: ' + pipe.datasetFilesByType.datapoints.length);
      return done(err, pipe);
    }
  );

  function getKeyValuePair(file) {
    const {dimensionGids, measureGids} = datapointUtils.getMeasuresDimensionsFromFileSchema(file);

    // FIXME: value should be array because we have multiple measures per file
    return {
      key: dimensionGids.join(','),
      value: _.first(measureGids)
    };
  }
}

function _convertDatasetIndexToModel(pipe, done) {
  return async.setImmediate(() => {
    pipe.datasetIndexes = _.map(pipe.datasetIndex, mapDdfIndexToWsModel(pipe));
    return done(null, pipe);
  });
}

function _populateDatasetIndexWithOriginIds(pipe, done) {
  return async.mapLimit(pipe.datasetIndexes, constants.LIMIT_NUMBER_PROCESS, (index, onIndexPopulated) => {
    index.keyOriginIds = _.chain(index.key).map(getOriginId).compact().value();
    index.valueOriginId = getOriginId(index.value);

    return async.waterfall([
      async.constant({dataset: pipe.dataset, transacton: pipe.transaction, version: pipe.transaction.createdAt, index}),
      findEntityOriginIds,
      findDatapointsStatsForMeasure
    ], onIndexPopulated);
  }, (error, populatedDatasetIndexes) => {
    entityOriginIdsCache.clear();

    if (error) {
      return done(error);
    }

    pipe.datasetIndexes = populatedDatasetIndexes;
    return done(null, pipe);
  });

  function getOriginId(key) {
    const concept = pipe.concepts[key];
    return concept ? concept.originId : null;
  }
}

function _createDatasetIndex(pipe, done) {
  logger.info('** create Dataset Index documents');

  return async.eachLimit(
    _.chunk(pipe.datasetIndexes, 100),
    constants.LIMIT_NUMBER_PROCESS,
    indexRepository.create.bind(indexRepository),
    (err) => done(err, pipe)
  );
}

function findEntityOriginIds(pipe, done) {
  const cacheKey = `${pipe.dataset._id}${pipe.version}${_.join(pipe.index.key, ',')}`;
  if (entityOriginIdsCache.has(cacheKey)) {
    return async.setImmediate(() => {
      pipe.entityOriginIds = entityOriginIdsCache.get(cacheKey);
      done(null, pipe);
    });
  }

  return entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version)
    .findAllHavingGivenDomainsOrSets(pipe.index.keyOriginIds, pipe.index.keyOriginIds, (error, entities) => {
      if (error) {
        return done(error);
      }

      pipe.entityOriginIds = _.map(entities, 'originId');
      entityOriginIdsCache.set(cacheKey, pipe.entityOriginIds);
      return done(null, pipe);
    });
}

function findDatapointsStatsForMeasure(pipe, done) {
  if (pipe.index.type !== 'datapoints') {
    return async.setImmediate(() => done(null, pipe.index));
  }

  return datapointsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version).findStats({
    measureId: pipe.index.valueOriginId,
    entityIds: pipe.entityOriginIds,
    dimensionsSize: _.size(pipe.index.key)
  }, (error, stats) => {
    if (error) {
      return done(error);
    }

    _.merge(pipe.index, _.omit(stats, '_id'));
    return done(null, pipe.index);
  });
}

function mapDdfIndexToWsModel(pipe) {
  return function (item) {
    return {
      key: item.key.split(','),
      value: item.value || '',
      source: item.file || [],
      type: item.type,

      dataset: pipe.dataset._id,
      transaction: pipe.transaction._id
    };
  };
}
