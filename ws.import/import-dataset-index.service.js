'use strict';

const _ = require('lodash');
const fs = require('fs');
const async = require('async');
const mongoose = require('mongoose');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository.js');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository.js');

const common = require('./common');
const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');
const ddfUtils = require('../ws.utils/ddf.utils');

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
  ], (err) => done(err, pipe));
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
    pipe.datasetFilesByType.concepts,
    constants.LIMIT_NUMBER_PROCESS,
    (item, completeSearchForConcepts) => {
      common.readCsvFile(pipe.resolvePath(item), {}, (err, res) => {

        if (err) {
          return completeSearchForConcepts(err);
        }

        const conceptKey = 'concept';
        const datasetConceptsIndexes = _.reduce(res, (result, row) => {
          result.push({
            key: conceptKey,
            value: row[conceptKey],
            file: [item],
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
    pipe.datasetFilesByType.entities,
    constants.LIMIT_NUMBER_PROCESS,
    (item, completeSearchForEntities) => {
      common.readCsvFile(pipe.resolvePath(item), {}, (err, rows) => {

        if (err) {
          return completeSearchForEntities(err);
        }

        const entityFileHeader = _.first(rows);
        const entityName = getEntityName(item);

        const datasetEntitiesIndexes = _.chain(entityFileHeader)
          .keys()
          .reduce((result, column) => {
            if (column !== entityName) {
              result.push({
                key: entityName,
                value: column,
                file: [item],
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

  function getEntityName(item) {
    const entityNameRegExp = /--.*--(.*).csv$/;
    const entityNameMatch = entityNameRegExp.exec(item);
    return _.get(entityNameMatch, '1');
  }
}
function _generateDatasetIndexFromDatapoints(pipe, done) {
  return async.forEachOfLimit(
    pipe.datasetFilesByType.datapoints,
    constants.LIMIT_NUMBER_PROCESS,
    function (item, key, completeSearchForDatapoints) {

      const keyValuePair = getKeyValuePair(item);
      const existedItem = pipe.datasetIndex.find(arrayItem => arrayItem.key == keyValuePair.key && arrayItem.value == keyValuePair.value);

      // check that item not exists
      if (existedItem) {
        existedItem.file.push(item);
      } else {
        pipe.datasetIndex.push({
          key: keyValuePair.key,
          value: keyValuePair.value,
          file: [item],
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

  function getKeyValuePair(item) {
    const parsedFilename = common.getMeasureDimensionFromFilename(item);

    // FIXME: value should be array because we have multiple measures per file
    return {
      key: parsedFilename.dimensions.join(','),
      value: _.first(parsedFilename.measures)
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
      async.constant({dataset: pipe.dataset, transacton: pipe.transaction, version: pipe.transaction.createdAt, index, concepts: pipe.concepts}),
      findEntityOriginIds,
      calculateDdfqlFunctions
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
    __createDatasetIndex,
    (err) => done(err, pipe));

  function __createDatasetIndex(chunk, cb) {
    return mongoose.model('DatasetIndex').create(chunk, cb);
  }
}

function findEntityOriginIds(pipe, done) {
  const cacheKey = `${pipe.dataset._id}${pipe.version}${_.join(pipe.index.key, ',')}`;
  if (entityOriginIdsCache.has(cacheKey)) {
    return async.setImmediate(() => {
      _.extend(pipe, entityOriginIdsCache.get(cacheKey));
      done(null, pipe);
    });
  }

  return entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version)
    .findAllHavingGivenDomainsOrSets(pipe.index.keyOriginIds, pipe.index.keyOriginIds, (error, entities) => {
      if (error) {
        return done(error);
      }

      entityOriginIdsCache.set(cacheKey, {entityOriginIds: _.map(entities, 'originId'), entities});
      return done(null, _.extend(pipe, entityOriginIdsCache.get(cacheKey)));
    });
}

function calculateDdfqlFunctions(pipe, done) {
  if (pipe.index.type !== 'datapoints') {
    return async.setImmediate(() => done(null, pipe.index));
  }

  const datapointRepository = datapointsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  return async.parallelLimit({
      statsForGivenMeasure: done => datapointRepository.findStats({
        measureId: pipe.index.valueOriginId,
        entityIds: pipe.entityOriginIds,
        dimensionsSize: _.size(pipe.index.key)
      }, done),
      dimensionsDefinedForGivenMeasure: done => datapointRepository.findDistinctDimensionsOriginIdsByMeasure({
        measureId: pipe.index.valueOriginId
      }, done)
    },
    constants.LIMIT_NUMBER_PROCESS,
    (error, result) => {
      if (error) {
        return done(error);
      }

      const statsForIndexKey = calculateStatsForIndexKey(
        pipe.concepts,
        pipe.entities,
        result.dimensionsDefinedForGivenMeasure
      );

      pipe.index = _.reduce(statsForIndexKey, (index, indexKeyStats) => _.merge(index, indexKeyStats), pipe.index);
      pipe.index = _.merge(pipe.index, result.statsForGivenMeasure);

      return done(null, pipe.index);
    });
}

function calculateStatsForIndexKey(concepts, entities, dimensionsDefinedForGivenMeasure) {
  const timeConceptsByOriginId = _.keyBy(ddfUtils.filterTimeConcepts(concepts), 'originId');

  const timeEntitiesByDomainOriginId = _.chain(entities)
    .filter(entity => _.includes(dimensionsDefinedForGivenMeasure, _.toString(entity.originId)))
    .groupBy('domain')
    .pickBy((entities, domain) => timeConceptsByOriginId[domain])
    .value();

  return _.mapValues(timeEntitiesByDomainOriginId, (timeEntities, timeDomainOriginId) => {
    const timeDomainGid = timeConceptsByOriginId[timeDomainOriginId].gid;
    const pathToMillis = `parsedProperties.${timeDomainGid}.millis`;
    return {
      [`max(${timeDomainGid})`]: _.get(_.maxBy(timeEntities, pathToMillis), 'gid'),
      [`min(${timeDomainGid})`]: _.get(_.minBy(timeEntities, pathToMillis), 'gid')
    };
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
