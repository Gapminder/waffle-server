'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');

const logger = require('../ws.config/log');
const ddfImportUtils = require('./utils/import-ddf.utils');
const constants = require('../ws.utils/constants');
const fileUtils = require('../ws.utils/file');
const entitiesUtils = require('./utils/entities.utils');
const ddfMappers = require('./utils/ddf-mappers');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');

module.exports = (externalContext, done) => {
  logger.info('Start process of entities creation');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'datapackage',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset'
  ]));

  const entitiesCreateStream = createEntities(externalContextFrozen);
  ddfImportUtils.startStreamProcessing(entitiesCreateStream, externalContext, done);
};

function createEntities(externalContext) {
  return hi(externalContext.datapackage.resources)
    .filter(resource => resource.type === constants.ENTITIES)
    .flatMap(resource => loadEntitiesFromCsv(resource, externalContext))
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap(entitiesBatch => {
      return hi(storeEntitesToDb(entitiesBatch));
    });
}

function loadEntitiesFromCsv(resource, externalContext) {
  const {pathToDdfFolder} = externalContext;

  return fileUtils.readCsvFileAsStream(pathToDdfFolder, resource.path)
    .map(rawEntity => {
      const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, externalContext);
      const context = _.extend({filename: resource.path}, setsAndDomain, externalContext);
      return toEntity(rawEntity, context);
    });
}

function storeEntitesToDb(entities) {
  return entitiesRepositoryFactory.versionAgnostic().create(entities);
}

function toEntity(rawEntity, externalContext) {
  //entitySetsOriginIds is unnecessary for import process
  const {
    entitySet,
    entitySetsOriginIds,
    concepts,
    entityDomain,
    filename,
    timeConcepts,
    transaction: {
      createdAt: version
    },
    dataset: {
      _id: datasetId
    }
  } = externalContext;

  const context = {entitySet, concepts, entityDomain, filename, timeConcepts, version, datasetId, entitySetsOriginIds};

  return ddfMappers.mapDdfEntityToWsModel(rawEntity, context);
}
