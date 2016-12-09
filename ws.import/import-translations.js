'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');
const path = require('path');

const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');
const ddfImportUtils = require('./utils/import-ddf.utils');
const ddfMappers = require('./utils/ddf-mappers');
const datapackageParser = require('./utils/datapackage.parser');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');

module.exports = importTranslations;

function importTranslations(externalContext, done) {
  logger.info('start process creating translations');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'datapackage',
    'concepts',
    'transaction',
    'dataset'
  ]));

  const translationsCreateStream = createTranslations(externalContextFrozen);
  ddfImportUtils.startStreamProcessing(translationsCreateStream, externalContext, done);
}

function createTranslations(externalContext) {
  const {
    pathToDdfFolder,
    datapackage: {resources, translations},
    dataset: {_id: datasetId},
    transaction: {createdAt: version}
  } = externalContext;

  const loadTranslationsStream = hi(resources)
    .flatMap(resource => {
      return extendTranslationsToResourceStream(translations, resource);
    })
    .flatMap(resource => {
      const resolvedFilepath = path.resolve(pathToDdfFolder, resource.pathToTranslationFile);

      return existTranslationFilepathStream(resolvedFilepath, resource);
    })
    .filter(resource => {
      return _.get(resource, 'access', true);
    })
    .flatMap(resource => {
      return loadTranslationsFromCsv(resource, externalContext);
    });

  const storeConceptTranslationsStream = loadTranslationsStream.fork()
    .filter(({resource: {primaryKey}}) => datapackageParser.isConceptsResource(primaryKey))
    .map(({object: properties, resource: {language}}) => {
      const context = {properties, language, datasetId, version};

      return hi(storeConceptsTranslationsToDb(context));
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);

  const storeEntitiesTranslationsStream = loadTranslationsStream.fork()
    .filter(({resource: {primaryKey}}) => datapackageParser.isEntitiesResource(primaryKey))
    .map(({object: properties, resource: {language, path: source, primaryKey: [primaryKey], fields}}) => {
      const fieldsByName = _.keyBy(fields, 'name');
      const resolvedProperties = _.reduce(properties, (result, propertyValue, propertyName) => {
        if (fieldsByName.hasOwnProperty(`is--${propertyName}`)) {
          result[`properties.is--${propertyName}`] = propertyValue;
        }
        if (propertyName === primaryKey) {
          result['gid'] = propertyValue;
        }
        return result;
      }, {});
      const context = {source, properties, language, resolvedProperties, datasetId, version};

      return hi(storeEntitiesTranslationsToDb(context));
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);

  const storeDatapointsTranslationsStream = loadTranslationsStream.fork()
    .filter(({resource: {primaryKey}}) => datapackageParser.isDatapointsResource(primaryKey))
    .map(({object: properties, resource: {language, path: source, primaryKey}}) => {
      const resolvedProperties = _.reduce(properties, (result, propertyValue, propertyName) => {
        if (_.includes(primaryKey, propertyName)) {
          result[`properties.${propertyName}`] = propertyValue;
        }
        return result;
      }, {});
      const context = {source, properties, language, resolvedProperties, datasetId, version};

      return hi(storeDatapointsTranslationsToDb(context));
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);

  const translationTasks = [
    storeConceptTranslationsStream,
    storeEntitiesTranslationsStream,
    storeDatapointsTranslationsStream
  ];

  return hi(translationTasks).parallel(translationTasks.length);
}

function storeConceptsTranslationsToDb({properties, language, datasetId, version}) {
  const translation = ddfMappers.transformConceptTranslation(properties);

  return conceptsRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(translation, {language});
}

function storeEntitiesTranslationsToDb(externalContext) {
  const {source, properties, language, resolvedProperties, datasetId, version} = externalContext;
  const translation = ddfMappers.transformEntityTranslation(properties);

  return entitiesRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(translation, {language, source, resolvedProperties});
}

function storeDatapointsTranslationsToDb(externalContext) {
  const {source, properties, language, resolvedProperties, datasetId, version} = externalContext;
  return datapointsRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(properties, {language, source, resolvedProperties});
}

function existTranslationFilepathStream(resolvedFilepath, resource) {
  return hi.wrapCallback(fs.access)(resolvedFilepath, fs.constants.F_OK | fs.constants.R_OK)
    .errors(() => {
      return _.extend({access: false}, resource);
    })
    .map(() => {
      return _.extend({access: true}, resource);
    });
}

function extendTranslationsToResourceStream(translations, resource) {
  return hi(_.map(translations, language => {
    const pathToTranslationFile = path.join(constants.DEFAULT_DDF_LANGUAGE_FOLDER, language.id, resource.path);

    return _.extend({language, pathToTranslationFile}, resource);
  }));
}

function loadTranslationsFromCsv(resource, externalContext) {
  const {pathToDdfFolder} = externalContext;

  return ddfImportUtils.readCsvFileAsStream(pathToDdfFolder, resource.pathToTranslationFile)
    .map(rawTranslation => {
      return {object: rawTranslation, resource};
    });
}
