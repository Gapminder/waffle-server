'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');

const logger = require('../ws.config/log');
const ddfUtils = require('./utils/import-ddf.utils');
const constants = require('../ws.utils/constants');
const entitiesUtils = require('./utils/entities.utils');
const ddfMappers = require('./utils/ddf-mappers');
const entitiesRepositoryFactory = require('./../ws.repository/ddf/entities/entities.repository');

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

  const errors = [];
  createEntities(externalContextFrozen)
    .stopOnError(error => {
      errors.push(error);
    })
    .done(() => {
      if (!_.isEmpty(errors)) {
        return done(errors, externalContext);
      }
      return done(null, externalContext);
    });
};

function createEntities(externalContext) {
  return hi(externalContext.datapackage.resources)
    .filter(resource => resource.type === constants.ENTITIES)
    .flatMap(resource => loadEntitiesFromCsv(resource, externalContext))
    .batch(1500)
    .flatMap(entitiesBatch => {
      return hi(storeEntitesToDb(entitiesBatch));
    })
}

function loadEntitiesFromCsv(resource, externalContext) {
  const {pathToDdfFolder} = externalContext;

  return ddfUtils.readCsvFileAsStream(pathToDdfFolder, resource.path)
    .map(rawEntity => {
      const setsAndDomain = entitiesUtils.getSetsAndDomain(resource, externalContext);
      const context = _.extend({filename: resource.path}, setsAndDomain, externalContext);
      return toEntity(rawEntity, context)
    });
}

function storeEntitesToDb(entities) {
  return entitiesRepositoryFactory.versionAgnostic().create(entities);
}

function toEntity(rawEntity, externalContext) {
  const {
    entitySet,
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

  const context = {entitySet, concepts, entityDomain, filename, timeConcepts, version, datasetId};

  return ddfMappers.mapDdfEntityToWsModel(rawEntity, context);
}
