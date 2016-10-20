/*eslint camelcase: 0*/
'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Converter = require('csvtojson').Converter;

const mongoose = require('mongoose');
const constants = require('../ws.utils/constants');
const reposService = require('../ws.services/repos.service');

const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time'];

const logger = require('../ws.config/log');
const config = require('../ws.config/config');

const ddfTimeUtils = require('ddf-time-utils');

const DEFAULT_CHUNK_SIZE = 2000;
const MONGODB_DOC_CREATION_THREADS_AMOUNT = 3;

module.exports = {
  // File utils
  readCsvFile,
  parseFilename: _parseFilename,
  resolvePathToDdfFolder,
  getMeasureDimensionFromFilename,

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
  createEntitiesBasedOnDataPoints: _createEntitiesBasedOnDataPoints,
  mapDdfEntityToWsModel,

  //Datapoints
  createDataPoints,
  findDataPoints,
  _createDataPoints,
  processRawDataPoints: __processRawDataPoints,

  //Dataset
  createDataset,
  findDataset,

  //Transaction
  createTransaction,
  closeTransaction,
  updateTransaction
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

  mongoose.model('DatasetTransactions').create({
    name: Math.random().toString(),
    createdAt: (new Date()).valueOf(),
    createdBy: pipe.user._id,
    commit: pipe.commit
  }, (err, res) => {
    pipe.transaction = res.toObject();
    return done(err, pipe);
  });
}

function closeTransaction(pipe, done) {
  logger.info('close transaction');

  mongoose.model('DatasetTransactions').findOneAndUpdate({
    _id: pipe.transaction._id
  }, {
    $set: {
      isClosed: true,
      timeSpentInMillis: Date.now() - pipe.transaction.createdAt
    }
  }, (err) => {
    return done(err, pipe);
  });
}

function createDataset(pipe, done) {
  logger.info('create data set');

  mongoose.model('Datasets').create({
    name: pipe.datasetName,
    type: 'local',
    path: pipe.github,
    defaultLanguage: 'en',
    versions: [pipe.transaction.createdAt],
    dataProvider: 'semio',
    createdAt: pipe.transaction.createdAt,
    createdBy: pipe.user._id
  }, (err, res) => {
    pipe.dataset = res.toObject();
    return done(err, pipe);
  });
}

function updateTransaction(pipe, done) {
  logger.info('update transaction');

  mongoose.model('DatasetTransactions').update({_id: pipe.transactionId || pipe.transaction._id}, {
    $set: {
      dataset: pipe.dataset._id
    }
  }, (err) => {
    return done(err, pipe);
  });
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
    return mongoose.model('Concepts').create(chunk, cb);
  }
}

function _getAllConcepts(pipe, done) {
  logger.info('** get all concepts');

  mongoose.model('Concepts').find({
    dataset: pipe.dataset._id,
    transaction: pipe.transaction._id
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transaction._id
        }
      },
      subsetOf: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transaction._id
        }
      },
      dimensions: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transaction._id
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
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

    mongoose.model('Concepts').update(
      {
        dataset: pipe.datasetId || pipe.dataset._id,
        transaction: pipe.transactionId || pipe.transaction._id,
        'properties.drill_up': gid
      },
      {$addToSet: {'subsetOf': concept._id}},
      {multi: true},
      escb
    );
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

    mongoose.model('Concepts').update(
      {
        dataset: pipe.datasetId || pipe.dataset._id,
        transaction: pipe.transactionId || pipe.transaction._id,
        'properties.domain': gid
      },
      {$set: {'domain': concept._id}},
      {multi: true},
      escb
    );
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

  return async.eachLimit(
    _.chunk(pipe.entities, DEFAULT_CHUNK_SIZE),
    MONGODB_DOC_CREATION_THREADS_AMOUNT,
    (chunk, cb) => mongoose.model('Entities').create(chunk, (err) => {
      return cb(err);
    }),
    (err) => {
      return done(err, pipe);
    }
  );
}

function _findAllEntities(pipe, done) {
  logger.info('** find all entities');

  mongoose.model('Entities').find({
    dataset: pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      },
      sets: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      },
      drillups: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      pipe.entities = res;
      return done(err, pipe);
    });
}

function _addEntityDrillups(pipe, done) {
  logger.info('** add entity drillups');
  let relations = flatEntityRelations(pipe);

  // TODO: fix drillup for merged entities
  // (for hkg created only main_religion_2008 `eastern_religions`, but not country `hkg`)
  async.forEachOfLimit(relations, constants.LIMIT_NUMBER_PROCESS, (drillups, _id, escb) => {
    if (!drillups.length) {
      return escb();
    }

    mongoose.model('Entities').update(
      {_id: _id},
      {$addToSet: {'drillups': {$each: drillups}}},
      {multi: true},
      escb
    );
  }, (err) => {
    return done(err, pipe);
  });
}

function createDataPoints(pipe, done) {
  logger.info('start process creating data points');
  fs.readdir(pipe.pathToDdfFolder, (err, _filenames) => {
    const filenames = _filenames.filter(filename => /^ddf--datapoints--/.test(filename));
    pipe.filenames = filenames;

    async.forEachOfSeries(
      filenames,
      _processDataPoints(pipe),
      err => done(err, pipe)
    );
  });

  function _processDataPoints(pipe) {
    return (filename, key, cb) => async.waterfall([
      async.constant({
        filename: filename,
        concepts: pipe.concepts,
        timeConcepts: pipe.timeConcepts,
        transaction: pipe.transaction,
        dataset: pipe.dataset,
        resolvePath: pipe.resolvePath
      }),
      _parseFilename,
      _findAllEntities,
      _loadDataPoints,
      _createEntitiesBasedOnDataPoints,
      _findAllEntities,
      _createDataPoints
    ], err => {
      logger.info(`** Processed ${key + 1} of ${pipe.filenames.length} files`);

      return cb(err);
    });
  }
}

function getMeasureDimensionFromFilename(filename) {
  let parsedFileName = filename.replace(/^ddf--datapoints--|\.csv$/g, '').split('--by--');
  return {
    measures: _.first(parsedFileName).split('--'),
    dimensions: _.chain(parsedFileName)
      .last()
      .split('--')
      .map(dimension => _.first(dimension.split('-')))
      .value()
  };
}

function _parseFilename(pipe, cb) {
  logger.info(`** parse filename '${pipe.filename}'`);

  const parseFilename = getMeasureDimensionFromFilename(pipe.filename);
  const measureGids = parseFilename.measures;
  const dimensionGids = parseFilename.dimensions;

  pipe.measures = _.merge(_.pick(pipe.previousConcepts, measureGids), _.pick(pipe.concepts, measureGids));
  pipe.dimensions = _.merge(_.pick(pipe.previousConcepts, dimensionGids), _.pick(pipe.concepts, dimensionGids));

  if (_.isEmpty(pipe.measures)) {
    return async.setImmediate(() => cb(`file '${pipe.filename}' doesn't have any measure.`));
  }

  if (_.isEmpty(pipe.dimensions)) {
    return async.setImmediate(() => cb(`file '${pipe.filename}' doesn't have any dimensions.`));
  }

  logger.info(`** parsed measures: ${_.keys(pipe.measures)}`);
  logger.info(`** parsed dimensions: ${_.keys(pipe.dimensions)}`);

  return async.setImmediate(() => cb(null, pipe));
}

function _loadDataPoints(pipe, cb) {
  logger.info(`** load data points`);

  readCsvFile(pipe.resolvePath(pipe.filename), {}, __processRawDataPoints(pipe, cb));
}

function __processRawDataPoints(pipe, cb) {
  return (err, res) => {
    // TODO: account must be taken of entities that
    // could have equal gids in different sets (groupBy)
    let dictionary = _.keyBy(pipe.entities, 'gid');
    let gids = new Set();
    let entities = _.chain(res)
      .reduce((result, datapoint) => {
        _.each(pipe.dimensions, (concept) => {
          let domain = concept.domain || concept;

          if (!dictionary[datapoint[concept.gid]] && !gids.has(datapoint[concept.gid])) {
            let mappedEntity = mapDdfInDatapointsFoundEntityToWsModel(datapoint, concept, domain, pipe);
            result.push(mappedEntity);
            gids.add(datapoint[concept.gid]);
          }
        });

        return result;
      }, [])
      .value();

    pipe.raw = {
      dataPoints: res,
      entities: entities
    };

    return async.setImmediate(() => cb(err, pipe));
  };
}

function _createEntitiesBasedOnDataPoints(pipe, cb) {
  if (_.isEmpty(pipe.raw.entities)) {
    logger.info(`** There is no new entities in data points file.`);

    return async.setImmediate(() => cb(null, pipe));
  }

  logger.info(`** create entities based on data points`);

  mongoose.model('Entities').create(pipe.raw.entities, (err) => {
    pipe.raw.entities = [];
    return cb(err, pipe);
  });
}

function _createDataPoints(pipe, cb) {
  let dataPoints = _.flatMap(pipe.raw.dataPoints, mapDdfDataPointToWsModel(pipe));

  if (_.isEmpty(dataPoints)) {
    logger.warn(`file '${pipe.filename}' is empty or doesn't exist.`);

    return async.setImmediate(() => cb(null, pipe));
  }

  logger.info(`** create data points`);

  async.eachLimit(
    _.chunk(dataPoints, DEFAULT_CHUNK_SIZE),
    MONGODB_DOC_CREATION_THREADS_AMOUNT,
    (dataPoint, plcb) => {
      mongoose.model('DataPoints').create(dataPoint, err => plcb(err));
    }, (err) => {
      pipe.raw = {};
      return cb(err, pipe);
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
  return mongoose.model('DataPoints').distinct(
    'dimensions',
    {
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
      measure: pipe.measure.originId,
    },
    (err, res) => {
      pipe.originIdsOfEntities = res;
      return cb(err, pipe);
    }
  );
}

function ___getAllSetsBySelectedEntities(pipe, cb) {
  return mongoose.model('Entities').distinct(
    'sets',
    {
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
      originId: {$in: pipe.originIdsOfEntities},
    },
    (err, res) => {
      pipe.originIdsOfEntitySets = res;
      return cb(err, pipe);
    }
  );
}

function ___getAllDimensionsBySelectedEntities(pipe, cb) {
  return mongoose.model('Entities').distinct(
    'domain',
    {
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
      originId: {$in: pipe.originIdsOfEntities},
    },
    (err, res) => {
      pipe.originIdsOfEntityDomains = res;
      return cb(err, pipe);
    }
  );
}

function ___updateDimensionByMeasure(pipe, cb) {
  let dimensions = _.concat([], pipe.originIdsOfEntitySets, pipe.originIdsOfEntityDomains);
  if (_.isEmpty(dimensions)) {
    return cb(null, pipe);
  }

  return mongoose.model('Concepts').update(
    {
      dataset: pipe.datasetId || pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
      originId: pipe.measure.originId,
    },
    {$addToSet: {dimensions: {$each: dimensions}}},
    (err) => {
      return cb(err, pipe);
    });
}

function findDataset(pipe, done) {
  let query = pipe.datasetId ? {_id: pipe.datasetId} : {name: pipe.datasetName || process.env.DATASET_NAME};
  mongoose.model('Datasets').findOne(query)
    .lean()
    .exec((err, res) => {
      pipe.dataset = res;
      return done(err, pipe);
    });
}

function findDataPoints(pipe, done) {
  console.time('find all datapoints');
  mongoose.model('DataPoints').find({
    dataset: pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
  }, null, {
    join: {
      dimensions: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      },
      measure: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      }
    }
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      console.timeEnd('find all datapoints');
      pipe.datapoints = res;
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
      transaction: pipe.transactionId || pipe.transaction._id
    };
  };
}

function mapDdfEntityToWsModel(pipe) {
  return (entry) => {
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
      parsedProperties: parseProperties(pipe.entityDomain, gid, _entry, pipe.timeConcepts),

      originId: _entry.originId,
      domain: domainOriginId,
      sets: resolvedSets,

      from: pipe.transaction.createdAt,
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id
    };
  };
}

function mapDdfInDatapointsFoundEntityToWsModel(entity, concept, domain, pipe) {
  const gid = entity[concept.gid];
  return {
    gid: gid,
    sources: [pipe.filename],
    properties: entity,
    parsedProperties: parseProperties(concept, gid, entity, pipe.timeConcepts),

    // originId: entity.originId,
    domain: domain.originId,
    sets: concept.type === 'entity_set' ? [concept.originId] : [],
    drillups: [],

    from: pipe.transaction.createdAt,
    dataset: pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
  };
}

function parseProperties(concept, entityGid, entityProperties, timeConcepts) {
  if (_.isEmpty(timeConcepts)) {
    return {};
  }

  let parsedProperties =
    _.chain(entityProperties)
      .pickBy((propValue, prop) => timeConcepts[prop])
      .mapValues(toInternalTimeForm)
      .value();

  if (timeConcepts[concept.gid]) {
    parsedProperties = _.extend(parsedProperties || {}, {[concept.gid]: toInternalTimeForm(entityGid)});
  }
  return parsedProperties;
}

function toInternalTimeForm(value) {
  const timeDescriptor = ddfTimeUtils.parseTime(value);
  return {
    millis: _.get(timeDescriptor, 'time'),
    timeType: _.get(timeDescriptor, 'type')
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

function mapDdfDataPointToWsModel(pipe) {
  return function (entry, key) {
    let isValidEntry = _.chain(entry)
      .values()
      .every((value, key) => !_.isNil(value) || key !== 'originId')
      .value();

    if (!isValidEntry) {
      logger.error(`[${key}] Validation error: There is empty value(s) in file '${pipe.filename}'`);
      return [];
    }

    // TODO: rewrite with _.pick
    const dimensions = _.chain(entry)
      .keys()
      .filter(conceptGid => _.keys(pipe.dimensions).indexOf(conceptGid) > -1)
      .reduce((result, conceptGid) => {
        const entity = _.find(pipe.entities, (_entity) => {
          return _entity.gid == entry[conceptGid];
        });

        result.push(entity.originId);

        return result;
      }, [])
      .value();

    // TODO: rewrite with _.pick
    return _.chain(entry)
      .keys()
      .filter(conceptGid => _.keys(pipe.measures).indexOf(conceptGid) > -1)
      .map((measureGid) => {
        const datapointValue = entry[measureGid];
        const datapointValueAsNumber = _.toNumber(datapointValue);
        return {
          value: _.isNaN(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: pipe.measures[measureGid].originId,
          dimensions: dimensions,
          originId: entry.originId,

          isNumeric: _.isNumber(entry[measureGid]),
          from: pipe.transaction.createdAt,
          dataset: pipe.dataset._id,
          sources: [pipe.filename],
          transaction: pipe.transactionId || pipe.transaction._id
        };
      })
      .value();
  };
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
