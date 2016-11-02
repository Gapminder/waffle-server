'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Converter = require('csvtojson').Converter;

const constants = require('../ws.utils/constants');
const reposService = require('../ws.services/repos.service');

const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time'];
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const conceptsRepositoryFactory = require('../ws.repository/ddf/concepts/concepts.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');
const transactionsRepository = require('../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');

const logger = require('../ws.config/log');
const config = require('../ws.config/config');
const ddfImportUtils = require('./import-ddf.utils');

const DEFAULT_CHUNK_SIZE = 2000;
const MONGODB_DOC_CREATION_THREADS_AMOUNT = 3;

module.exports = {
  // File utils
  readCsvFile,
  resolvePathToDdfFolder,

  // Concepts
  getAllConcepts: _getAllConcepts,
  createConcepts,
  addConceptSubsetOf: _addConceptSubsetOf,
  updateConceptsDimensions: _updateConceptsDimensions,
  createEntities,

  // Entities
  findAllEntities: _findAllEntities,
  storeEntitiesToDb: __storeEntitiesToDb,
  addEntityDrillups: _addEntityDrillups,
  mapDdfEntityToWsModel,

  //Dataset
  createDataset,
  findDataset,

  //Transaction
  createTransaction,
  closeTransaction,
  establishTransactionForDataset
};

function resolvePathToDdfFolder(pipe, done) {
  pipe.pathToDdfFolder = reposService.getPathToRepo(pipe.datasetName);
  pipe.resolvePath = (filename) => path.resolve(pipe.pathToDdfFolder, filename);
  pipe.fileTemplates = {
    getFilenameOfEntityDomainEntities: _.template('ddf--entities--${ gid }.csv'),
    getFilenameOfEntitySetEntities: _.template('ddf--entities--${ domain.gid }--${ gid }.csv'),
    getFilenameOfConcepts: _.template(pipe.resolvePath('ddf--concepts.csv'))
  };

  return async.setImmediate(() => {
    return done(null, pipe);
  });
}

function createTransaction(pipe, done) {
  logger.info('create transaction');

  const transaction = {
    createdAt: Date.now(),
    createdBy: pipe.user._id,
    commit: pipe.commit
  };

  transactionsRepository.create(transaction, (err, createdTransaction) => {
    pipe.transaction = createdTransaction;
    return done(err, pipe);
  });
}

function closeTransaction(pipe, done) {
  logger.info('close transaction');

  const options = {
    transactionId: pipe.transaction._id,
    transactionStartTime: pipe.transaction.createdAt
  };

  transactionsRepository.closeTransaction(options, err => {
    return done(err, pipe);
  });
}

function createDataset(pipe, done) {
  logger.info('create data set');

  const dataset = {
    name: pipe.datasetName,
    path: pipe.github,
    createdAt: pipe.transaction.createdAt,
    createdBy: pipe.user._id
  };

  datasetsRepository.create(dataset ,(err, createdDataset) => {
    pipe.dataset = createdDataset;
    return done(err, pipe);
  });
}

function establishTransactionForDataset(pipe, done) {
  logger.info('update transaction');

  const options = {
    transactionId: pipe.transaction._id,
    datasetId: pipe.dataset._id
  };

  transactionsRepository.establishForDataset(options, err => done(err, pipe));
}

function createConcepts(pipe, done) {

  logger.info('start process creating concepts');

  const filename = 'ddf--concepts.csv';
  const options = {transaction: pipe.transaction, dataset: pipe.dataset, resolvePath: pipe.resolvePath, filename};
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

  return readCsvFile(pipe.resolvePath(pipe.filename), {}, (err, res) => {
    let concepts = _.map(res, mapDdfConceptsToWsModel(pipe));
    let uniqConcepts = _.uniqBy(concepts, 'gid');

    if (uniqConcepts.length !== concepts.length) {
      return done('All concept gid\'s should be unique within the dataset!');
    }

    pipe.raw = {
      concepts: concepts,
      subsetOf: reduceUniqueNestedValues(concepts, 'properties.drill_up'),
      domains: reduceUniqueNestedValues(concepts, 'properties.domain')
    };

    return done(err, pipe);
  });
}

function _createConcepts(pipe, done) {
  logger.info('** create concepts documents');

  async.eachLimit(
    _.chunk(pipe.raw.concepts, DEFAULT_CHUNK_SIZE),
    MONGODB_DOC_CREATION_THREADS_AMOUNT,
    __createConcepts,
    (err) => {
      return done(err, pipe);
    }
  );

  function __createConcepts(chunk, cb) {
    return conceptsRepositoryFactory.versionAgnostic(pipe.dataset._id).create(chunk, cb);
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

function createEntities(pipe, done) {
  logger.info('start process creating entities');
  let _pipe = {
    transaction: pipe.transaction,
    concepts: pipe.concepts,
    timeConcepts: pipe.timeConcepts,
    dataset: pipe.dataset,
    fileTemplates: pipe.fileTemplates,
    resolvePath: pipe.resolvePath
  };

  async.waterfall([
    async.constant(_pipe),
    _processEntities,
    _findAllEntities,
    _addEntityDrillups,
    _findAllEntities
  ], (err, res) => {
    pipe.entities = res.entities;
    return done(err, pipe);
  });
}

function _processEntities(pipe, done) {
  logger.info('** process entities');

  let entitySets = _.filter(pipe.concepts, concept => defaultEntityGroupTypes.indexOf(concept.type) > -1);

  async.eachLimit(
    entitySets,
    constants.LIMIT_NUMBER_PROCESS,
    __processEntitiesPerConcept(pipe),
    err => done(err, pipe)
  );

  function __processEntitiesPerConcept(pipe) {
    return (entitySet, cb) => async.waterfall([
      async.constant({
        entitySet: entitySet,
        entityDomain: entitySet.type === 'entity_domain' ? entitySet : _.get(entitySet, 'domain', null),
        concepts: pipe.concepts,
        timeConcepts: pipe.timeConcepts,
        transaction: pipe.transaction,
        dataset: pipe.dataset,
        resolvePath: pipe.resolvePath,
        fileTemplates: pipe.fileTemplates
      }),
      __loadEntities,
      __storeEntitiesToDb
    ], cb);
  }
}

function __loadEntities(_pipe, cb) {
  _pipe.filename = _pipe.entitySet.domain
    ? _pipe.fileTemplates.getFilenameOfEntitySetEntities(_pipe.entitySet)
    : _pipe.fileTemplates.getFilenameOfEntityDomainEntities(_pipe.entitySet);

  logger.info(`**** load entities from file ${_pipe.filename}`);

  readCsvFile(_pipe.resolvePath(_pipe.filename), {}, (err, res) => {
    let entities = _.map(res, mapDdfEntityToWsModel(_pipe));
    let uniqEntities = _.uniqBy(entities, 'gid');

    if (uniqEntities.length !== entities.length) {
      return cb('All entity gid\'s should be unique within the Entity Set or Entity Domain!');
    }

    _pipe.entities = entities;
    return cb(err, _pipe);
  });
}

function __storeEntitiesToDb(pipe, done) {
  if (_.isEmpty(pipe.entities)) {
    logger.warn(`file '${pipe.filename}' is empty or doesn't exist.`);

    return async.setImmediate(() => done(null, pipe));
  }

  logger.info(`**** store entities from file '${pipe.filename}' to db`);

  const entitiesRepository = entitiesRepositoryFactory.versionAgnostic(pipe.dataset._id);

  return async.eachLimit(
    _.chunk(pipe.entities, DEFAULT_CHUNK_SIZE),
    MONGODB_DOC_CREATION_THREADS_AMOUNT,
    (chunk, cb) => entitiesRepository.create(chunk, cb),
    (err) => {
      return done(err, pipe);
    }
  );
}

function _findAllEntities(pipe, done) {
  return entitiesRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.entities = res;
      return done(err, pipe);
    });
}

function _addEntityDrillups(pipe, done) {
  logger.info('** add entity drillups');
  const relations = flatEntityRelations(pipe);

  const entitiesRepository = entitiesRepositoryFactory.versionAgnostic();
  async.forEachOfLimit(relations, constants.LIMIT_NUMBER_PROCESS, (drillups, _id, escb) => {
    if (!drillups.length) {
      return escb();
    }

    return entitiesRepository.addDrillupsByEntityId({entitiyId: _id, drillups}, escb);
  }, (err) => {
    return done(err, pipe);
  });
}

function _updateConceptsDimensions(pipe, cb) {
  logger.info(`** update property dimensions of concept`);

  // let dimensions = _.map(pipe.dimensions, 'originId');
  let measures = _.chain(pipe.concepts)
    .filter({type: 'measure'})
    .value();

  return async.eachLimit(
    measures,
    constants.LIMIT_NUMBER_PROCESS,
    __updateConceptDimension(pipe),
    (err) => {
      return cb(err, pipe);
    });
}

function __updateConceptDimension(pipe) {
  return (measure, cb) => {
    return async.waterfall([
      async.constant({measure, transaction: pipe.transaction, dataset: pipe.dataset}),
      ___getAllEntitiesByMeasure,
      ___getAllSetsBySelectedEntities,
      ___getAllDimensionsBySelectedEntities,
      ___updateDimensionByMeasure
    ], (err, res) => {
      logger.info(`**** updated dimensions for measure '${measure.gid}'`);

      return cb(err);
    });
  };
}

function ___getAllEntitiesByMeasure(pipe, cb) {
  return datapointsRepositoryFactory
    .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findDistinctDimensionsByMeasure(pipe.measure.originId, (err, res) => {
      pipe.originIdsOfEntities = res;
      return cb(err, pipe);
    });
}

function ___getAllSetsBySelectedEntities(pipe, cb) {
  return entitiesRepositoryFactory
    .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findDistinctSets(pipe.originIdsOfEntities, (err, res) => {
      pipe.originIdsOfEntitySets = res;
      return cb(err, pipe);
    });
}

function ___getAllDimensionsBySelectedEntities(pipe, cb) {
  return entitiesRepositoryFactory
    .allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findDistinctDomains(pipe.originIdsOfEntities, (err, res) => {
      pipe.originIdsOfEntityDomains = res;
      return cb(err, pipe);
    });
}

function ___updateDimensionByMeasure(pipe, cb) {
  let dimensions = _.concat([], pipe.originIdsOfEntitySets, pipe.originIdsOfEntityDomains);
  if (_.isEmpty(dimensions)) {
    return cb(null, pipe);
  }

  return conceptsRepositoryFactory.allOpenedInGivenVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .addDimensionsForMeasure({measureOriginId: pipe.measure.originId, dimensions}, err => {
      return cb(err, pipe);
    });
}

function findDataset(pipe, done) {
  return datasetsRepository.findByName(pipe.datasetName, (err, dataset) => {
    pipe.dataset = dataset;
    return done(err, pipe);
  });
}

//*** Mappers ***
function mapDdfConceptsToWsModel(pipe) {
  return function (entry, rowNumber) {
    let _entry = validateConcept(entry, rowNumber);

    return {
      gid: _entry.concept,

      title: _entry.name || _entry.title,
      type: (_entry.concept_type === 'time') ? 'entity_domain' : _entry.concept_type,

      tags: _entry.tags,
      tooltip: _entry.tooltip,
      indicatorUrl: _entry.indicator_url,
      color: _entry.color,
      unit: _entry.unit,
      scales: _entry.scales,
      properties: _entry,

      domain: null,
      subsetOf: [],
      dimensions: [],

      sources: [pipe.filename],
      from: pipe.transaction.createdAt,
      to: constants.MAX_VERSION,
      dataset: pipe.dataset._id,
      transaction: pipe.transaction._id
    };
  };
}

function mapDdfEntityToWsModel(pipe) {
  return (entry, context) => {
    let gid = getGid(pipe, entry);
    let resolvedColumns = mapResolvedColumns(entry);
    let resolvedSets = mapResolvedSets(pipe, resolvedColumns);
    let _entry = _.mapValues(entry, property => {
      let numericValue = property && _.toNumber(property);
      if (property === 'TRUE' || property === 'FALSE' || _.isBoolean(property)) {
        if (property === 'FALSE') {
          return false;
        }
        if (property === 'TRUE') {
          return true;
        }
        return property;
      }
      if (!_.isNaN(numericValue) && _.isNumber(numericValue)) {
        return numericValue;
      }
      return property;
    });

    const domainOriginId = _.get(pipe, 'entityDomain.originId', pipe.entityDomain);

    return {
      gid: gid,
      sources: [pipe.filename],
      properties: _entry,
      parsedProperties: ddfImportUtils.parseProperties(pipe.entityDomain, gid, _entry, pipe.timeConcepts),

      originId: _.get(context, 'originId', null),
      languages: _.get(context, 'languages', null),

      domain: domainOriginId,
      sets: resolvedSets,

      from: pipe.transaction.createdAt,
      dataset: pipe.dataset._id,
      transaction: pipe.transaction._id
    };
  };
}

function mapResolvedSets(pipe, resolvedGids) {
  return _.chain(pipe.concepts)
    .filter(concept => defaultEntityGroupTypes.indexOf(concept.type) > -1 && resolvedGids.indexOf(`is--${concept.gid}`) > -1)
    .filter(concept => concept.type !== 'entity_domain')
    .map('originId')
    .uniq()
    .value();
}

function mapResolvedColumns(entry) {
  return _.chain(entry)
    .keys()
    .filter(name => name.indexOf('is--') > -1 && entry[name])
    .uniq()
    .value();
}

//*** Validators ***
function validateConcept(entry, rowNumber) {
  let resolvedJSONColumns = ['color', 'scales', 'drill_up'];
  let _entry = _.mapValues(entry, (value, columnName) => {
    if (!value) {
      return null;
    }

    let isResolvedJSONColumn = resolvedJSONColumns.indexOf(columnName) > -1;
    let _value;

    try {
      _value = value && isResolvedJSONColumn && typeof value !== 'object' ? JSON.parse(value) : value;
    } catch (e) {
      logger.error(`[${rowNumber}, ${columnName}] Validation error: The cell value isn't valid JSON, fix it please!\nError message : ${e}\nGiven value: ${value}`);
      return null;
    }

    return _value;
  });

  return _entry;
}

//*** Utils ***
function reduceUniqueNestedValues(data, propertyName) {
  return _.chain(data)
    .flatMap(item => _.get(item, propertyName))
    .uniq()
    .compact()
    .value();
}

function getGid(pipe, entry) {
  let _value = entry[pipe.entitySet.gid] || (pipe.entitySet.domain && entry[pipe.entitySet.domain.gid]);

  if (!_value) {
    logger.warn(`Either '${pipe.entitySet.gid}' or '${pipe.entitySet.domain && pipe.entitySet.domain.gid}' columns weren't found in file '${pipe.filename}'`);
  }

  return _value;
}

function flatEntityRelations(pipe) {
  return _.chain(pipe.entities)
    .reduce((result, entity) => {
      let conceptsGids = _.chain(entity.properties)
        .keys()
        .filter(conceptGid => pipe.concepts[conceptGid] && pipe.concepts[conceptGid].type === 'entity_set' && entity.properties[conceptGid] !== entity.gid)
        .value();

      let resolvedEntitiesByConcepts = _getAllEntitiesByConcepts(pipe, conceptsGids, entity);

      result[entity._id] = _.map(resolvedEntitiesByConcepts, '_id');

      if (entity.isOwnParent) {
        result[entity._id] = entity._id;
      }

      return result;
    }, {})
    .value();

  function _getAllEntitiesByConcepts(pipe, conceptsGids, entity) {
    return _.map(conceptsGids, conceptGid => _getEntityOfCertainConcept(pipe, conceptGid, entity));
  }

  function _getEntityOfCertainConcept(pipe, conceptGid, entity) {
    return _.chain(pipe.entities)
      .find(e => _.some(e.sets, set => set.gid === conceptGid && entity.properties[conceptGid] === e.gid))
      .value();
  }
}

function readCsvFile(file, options, cb) {
  const converter = new Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(file, (err, data) => {
    if (err && err.toString().indexOf("cannot be found.") > -1) {
      logger.warn(err);
    }
    if (err && err.toString().indexOf("cannot be found.") === -1) {
      logger.error(err);
    }

    return cb(null, data);
  });
}
