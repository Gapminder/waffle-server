import * as _ from 'lodash';
import * as hi from 'highland';
import {logger} from '../ws.config/log';
import * as ddfImportUtils from './utils/import-ddf.utils';
import {constants} from '../ws.utils/constants';
import * as fileUtils from '../ws.utils/file';
import * as entitiesUtils from './utils/entities.utils';
import * as ddfMappers from './utils/ddf-mappers';
import {EntitiesRepositoryFactory} from '../ws.repository/ddf/entities/entities.repository';

export {
  startEntitiesCreation as createEntities
};

function startEntitiesCreation(externalContext, done) {
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
}

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
  return EntitiesRepositoryFactory.versionAgnostic().create(entities);
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
