'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');
const async = require('async');

const ddfImportUtils = require('./utils/import-ddf.utils');
const logger = require('../ws.config/log');
const config = require('../ws.config/config');
const constants = require('../ws.utils/constants');
const ddfMappers = require('./utils/ddf-mappers');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');

module.exports = createConcepts;

function createConcepts(pipe, done) {

  logger.info('start process creating concepts');

  const options = _.pick(pipe, [
    'transaction',
    'dataset',
    'resolvePath',
    'datapackage'
  ]);

  return async.waterfall([
    async.constant(options),
    _loadConcepts,
    _createConcepts,
    _getAllConcepts,
    _addConceptSubsetOf,
    _addConceptDomains,
    _getAllConcepts
  ], (err, res) => {
    pipe.concepts = res.concepts;
    pipe.timeConcepts = res.timeConcepts;
    return done(err, pipe);
  });
}

function _loadConcepts(pipe, done) {
  logger.info('** load concepts');

  let filename = null;
  hi(pipe.datapackage.resources)
    .filter(resource => resource.type === constants.CONCEPTS)
    .head()
    .flatMap(resource => {
      filename = resource.path;
      return ddfImportUtils.readCsvFileAsStream(pipe.resolvePath(resource.path))
    })
    .collect()
    .toCallback((error, rawConcepts) => {

      const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = pipe;

      const concepts = _.map(rawConcepts, rawConcept => {
        return ddfMappers.mapDdfConceptsToWsModel(rawConcept, {datasetId, version, filename});
      });

      pipe.raw = {
        concepts: concepts,
        subsetOf: reduceUniqueNestedValues(concepts, 'properties.drill_up'),
        domains: reduceUniqueNestedValues(concepts, 'properties.domain')
      };

      return done(error, pipe);
    });
}

function _createConcepts(pipe, done) {
  logger.info('** create concepts documents');

  async.eachLimit(
    _.chunk(pipe.raw.concepts, ddfImportUtils.DEFAULT_CHUNK_SIZE),
    ddfImportUtils.MONGODB_DOC_CREATION_THREADS_AMOUNT,
    __createConcepts,
    (err) => {
      return done(err, pipe);
    }
  );

  function __createConcepts(chunk, cb) {
    return conceptsRepositoryFactory.versionAgnostic().create(chunk, cb);
  }
}

function _getAllConcepts(pipe, done) {
  return conceptsRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.concepts = _.keyBy(res, 'gid');
      pipe.timeConcepts = _.pickBy(pipe.concepts, (value, conceptGid) => {
        return _.get(pipe.concepts[conceptGid], 'properties.concept_type') === 'time';
      });
      return done(err, pipe);
    });
}

function _addConceptSubsetOf(pipe, done) {
  logger.info('** add concept subsetOf');

  async.eachLimit(pipe.raw.subsetOf, constants.LIMIT_NUMBER_PROCESS, __updateConceptSubsetOf, (err) => {
    return done(err, pipe);
  });

  function __updateConceptSubsetOf(gid, escb) {
    let concept = pipe.concepts[gid];

    if (!concept) {
      logger.warn(`Drill up concept gid '${gid}' isn't exist!`);
      return async.setImmediate(escb);
    }

    return conceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
      .addSubsetOfByGid({gid, parentConceptId: concept._id}, escb);
  }
}

function _addConceptDomains(pipe, done) {
  logger.info('** add entity domains to related concepts');

  async.eachLimit(pipe.raw.domains, constants.LIMIT_NUMBER_PROCESS, __updateConceptDomain, (err) => {
    return done(err, pipe);
  });

  function __updateConceptDomain(gid, escb) {
    let concept = pipe.concepts[gid];

    if (!concept) {
      logger.warn(`Entity domain concept gid '${gid}' isn't exist!`);
      return async.setImmediate(escb);
    }

    return conceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
      .setDomainByGid({gid, domainConceptId: concept._id}, escb);
  }
}

//*** Utils ***
function reduceUniqueNestedValues(data, propertyName) {
  return _.chain(data)
    .flatMap(item => _.get(item, propertyName))
    .uniq()
    .compact()
    .value();
}
