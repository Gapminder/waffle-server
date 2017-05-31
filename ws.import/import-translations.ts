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
};

function importTranslations(externalContext: any, done: Function): void {
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

function createTranslations(externalContext: any): any {
  const {
    pathToDdfFolder,
    datapackage: {resources, translations},
    dataset: {_id: datasetId},
    transaction: {createdAt: version},
    concepts
  } = externalContext;

  const loadTranslationsStream = hi(resources)
    .flatMap((resource: any) => {
      return extendTranslationsToResourceStream(translations, resource);
    })
    .flatMap((resource: any) => {
      const resolvedFilepath = path.resolve(pathToDdfFolder, resource.pathToTranslationFile);

      return existTranslationFilepathStream(resolvedFilepath, resource);
    })
    .filter((resource: any) => {
      return _.get(resource, 'canReadTranslations', true);
    })
    .flatMap((resource: any) => {
      return loadTranslationsFromCsv(resource, externalContext);
    });

  const storeConceptTranslationsStream = loadTranslationsStream.fork()
    .filter(({resource: {primaryKey}}: any) => datapackageParser.isConceptsResource(primaryKey))
    .map(({object: properties, resource: {language}}: any) => {
      const context = {properties, language, datasetId, version};

      return hi(storeConceptsTranslationsToDb(context));
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);

  const storeEntitiesTranslationsStream = loadTranslationsStream.fork()
    .filter(({resource: {primaryKey}}: any) => datapackageParser.isEntitiesResource(primaryKey))
    .map(({object: properties, resource: {language, path: source, primaryKey: [primaryKey]}}: any) => {
      const resolvedProperties = _.reduce(properties, (result: any, propertyValue: any, propertyName: string) => {
        if (_.startsWith(propertyName, constants.IS_OPERATOR)) {
          result[`properties.${propertyName}`] = ddfImportUtils.toBoolean(propertyValue);
        }
        if (propertyName === primaryKey) {
          result.gid = propertyValue;
        }
        return result;
      }, {});
      const context = {source, properties, language, resolvedProperties, datasetId, version, concepts};

      return hi(storeEntitiesTranslationsToDb(context));
    })
    .parallel(constants.LIMIT_NUMBER_PROCESS);

  const storeDatapointsTranslationsStream = loadTranslationsStream.fork()
    .filter(({resource: {primaryKey}}: any) => datapackageParser.isDatapointsResource(primaryKey))
    .map(({object: properties, resource: {language, path: source, primaryKey}}: any) => {
      const resolvedProperties = _.reduce(properties, (result: any, propertyValue: any, propertyName: string) => {
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

function storeConceptsTranslationsToDb({properties, language, datasetId, version}: any): any {
  const translation = ddfMappers.transformConceptProperties(properties);

  return ConceptsRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(translation, {language});
}

function storeEntitiesTranslationsToDb(externalContext: any): any {
  const {source, properties, language, resolvedProperties, datasetId, version, concepts} = externalContext;
  const translation = ddfMappers.transformEntityProperties(properties, concepts);

  return EntitiesRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(translation, {language, source, resolvedProperties});
}

function storeDatapointsTranslationsToDb(externalContext: any): any {
  const {source, properties, language, resolvedProperties, datasetId, version} = externalContext;
  return DatapointsRepositoryFactory
    .allOpenedInGivenVersion(datasetId, version)
    .addTranslationsForGivenProperties(properties, {language, source, resolvedProperties});
}

function existTranslationFilepathStream(resolvedFilepath: string, resource: any): any {
  return hi.wrapCallback((path: string, mode: number, done: Function) => {
    fs.access(path, mode, (error: Error) => {
      done(null, _.isNil(error));
    });
  })(resolvedFilepath, fs.constants.R_OK)
    .map((canAccess: boolean) => {
      return _.extend({canReadTranslations: canAccess}, resource);
    });
}

function extendTranslationsToResourceStream(translations: any, resource: any): any {
  return hi(_.map(translations, (language: any) => {
    const pathToTranslationFile = path.join(constants.DEFAULT_DDF_LANGUAGE_FOLDER, language.id, resource.path);

    return _.extend({language, pathToTranslationFile}, resource);
  }));
}

function loadTranslationsFromCsv(resource: any, externalContext: any): any {
  const {pathToDdfFolder} = externalContext;

  return fileUtils.readCsvFileAsStream(pathToDdfFolder, resource.pathToTranslationFile)
    .map((rawTranslation: any) => {
      return {object: rawTranslation, resource};
    });
}
