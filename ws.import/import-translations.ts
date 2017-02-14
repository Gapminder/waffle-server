import * as _ from 'lodash';
import * as fs from 'fs';
import * as hi from 'highland';
import * as path from 'path';
import {logger} from '../ws.config/log';
import {constants} from '../ws.utils/constants';
import * as fileUtils from '../ws.utils/file';
import * as ddfImportUtils from './utils/import-ddf.utils';
import * as ddfMappers from './utils/ddf-mappers';
import * as datapackageParser from './utils/datapackage.parser';
import {ConceptsRepositoryFactory} from '../ws.repository/ddf/concepts/concepts.repository';
import {EntitiesRepositoryFactory} from '../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../ws.repository/ddf/data-points/data-points.repository';

export {
  importTranslations as createTranslations
}

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
    transaction: {createdAt: version},
    concepts
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
      const context = {source, properties, language, resolvedProperties, datasetId, version, concepts};

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
  const translation = ddfMappers.transformConceptProperties(properties);

  return ConceptsRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(translation, {language});
}

function storeEntitiesTranslationsToDb(externalContext) {
  const {source, properties, language, resolvedProperties, datasetId, version, concepts} = externalContext;
  const translation = ddfMappers.transformEntityProperties(properties, concepts);

  return EntitiesRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(translation, {language, source, resolvedProperties});
}

function storeDatapointsTranslationsToDb(externalContext) {
  const {source, properties, language, resolvedProperties, datasetId, version} = externalContext;
  return DatapointsRepositoryFactory
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
  return hi(_.map(translations, (language: any) => {
    const pathToTranslationFile = path.join(constants.DEFAULT_DDF_LANGUAGE_FOLDER, language.id, resource.path);

    return _.extend({language, pathToTranslationFile}, resource);
  }));
}

function loadTranslationsFromCsv(resource, externalContext) {
  const {pathToDdfFolder} = externalContext;

  return fileUtils.readCsvFileAsStream(pathToDdfFolder, resource.pathToTranslationFile)
    .map(rawTranslation => {
      return {object: rawTranslation, resource};
    });
}
