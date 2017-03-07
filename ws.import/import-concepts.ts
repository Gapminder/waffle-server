import * as _ from 'lodash';
import * as async from 'async';
import * as hi from 'highland';
import * as ddfImportUtils from './utils/import-ddf.utils';
import * as fileUtils from '../ws.utils/file';
import {logger} from '../ws.config/log';
import {constants} from '../ws.utils/constants';
import * as ddfMappers from './utils/ddf-mappers';
import {ConceptsRepositoryFactory} from '../ws.repository/ddf/concepts/concepts.repository';

export {
  createConcepts
};

function createConcepts(pipe: any, done: Function): void {

  logger.info('start process creating concepts');

  const options = _.pick(pipe, [
    'pathToDdfFolder',
    'transaction',
    'dataset',
    'datapackage'
  ]);

  return async.waterfall([
    async.constant(options),
    _loadConcepts,
    _createConcepts,
    ddfImportUtils.getAllConcepts,
    _addConceptSubsetOf,
    _addConceptDomains,
    ddfImportUtils.getAllConcepts
  ], (err: any, res: any) => {
    pipe.concepts = res.concepts;
    pipe.timeConcepts = res.timeConcepts;
    return done(err, pipe);
  });
}

function _loadConcepts(pipe: any, done: Function): void {
  logger.info('** load concepts');

  const {
    pathToDdfFolder,
    datapackage: {resources},
    dataset: {_id: datasetId},
    transaction: {createdAt: version}
  } = pipe;

  hi(resources)
    .filter((resource: any) => resource.type === constants.CONCEPTS)
    .head()
    .flatMap((resource: any) => {
      return fileUtils
        .readCsvFileAsStream(pathToDdfFolder, resource.path)
        .map((rawConcept: any) => ({filename: resource.path, object: rawConcept}));
    })
    .collect()
    .toCallback((error: any, rawConcepts: any) => {
      const concepts = _.map(rawConcepts, (rawConcept: any) => {
        const context = {datasetId, version, filename: rawConcept.filename};
        return ddfMappers.mapDdfConceptsToWsModel(rawConcept.object, context);
      });

      pipe.raw = {
        concepts,
        subsetOf: reduceUniqueNestedValues(concepts, 'properties.drill_up'),
        domains: reduceUniqueNestedValues(concepts, 'properties.domain')
      };

      return done(error, pipe);
    });
}

function _createConcepts(pipe: any, done: Function): void {
  logger.info('** create concepts documents');

  async.eachLimit(
    _.chunk(pipe.raw.concepts, ddfImportUtils.DEFAULT_CHUNK_SIZE),
    ddfImportUtils.MONGODB_DOC_CREATION_THREADS_AMOUNT,
    __createConcepts,
    (err: any) => {
      return done(err, pipe);
    }
  );

  function __createConcepts(chunk: any, cb: Function): void {
    return ConceptsRepositoryFactory.versionAgnostic().create(chunk, cb);
  }
}

function _addConceptSubsetOf(pipe: any, done: Function): void {
  logger.info('** add concept subsetOf');

  async.eachLimit(pipe.raw.subsetOf, constants.LIMIT_NUMBER_PROCESS, __updateConceptSubsetOf, (err: any) => {
    return done(err, pipe);
  });

  function __updateConceptSubsetOf(gid: string, escb: Function): any {
    let concept = pipe.concepts[gid];

    if (!concept) {
      logger.warn(`Drill up concept gid '${gid}' isn't exist!`);
      return async.setImmediate(escb);
    }

    return ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
      .addSubsetOfByGid({gid, parentConceptId: concept._id}, escb);
  }
}

function _addConceptDomains(pipe: any, done: Function): void {
  logger.info('** add entity domains to related concepts');

  async.eachLimit(pipe.raw.domains, constants.LIMIT_NUMBER_PROCESS, __updateConceptDomain, (err: any) => {
    return done(err, pipe);
  });

  function __updateConceptDomain(gid: string, escb: Function): any {
    let concept = pipe.concepts[gid];

    if (!concept) {
      logger.warn(`Entity domain concept gid '${gid}' isn't exist!`);
      return async.setImmediate(escb);
    }

    return ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
      .setDomainByGid({gid, domainConceptId: concept._id}, escb);
  }
}

// *** Utils ***
function reduceUniqueNestedValues(data: any, propertyName: string): any {
  return _.chain(data)
    .flatMap((item: any) => _.get(item, propertyName))
    .uniq()
    .compact()
    .value();
}
