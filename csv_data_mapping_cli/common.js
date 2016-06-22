/*eslint camelcase: 0*/
'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Converter = require('csvtojson').Converter;

const mongoose = require('mongoose');
const reposService = require('../ws.routes/ddf/import/repos.service.js');

// geo mapping
const geoMapping = require('./geo-mapping.json');
const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time', 'age'];
const defaultMeasureTypes = ['measure'];

const LIMIT_NUMBER_PROCESS = 10;
const MAX_VALUE = Number.MAX_SAFE_INTEGER;

let logger;
let config;
let ddfModels;

module.exports = function (app) {
  logger = app.get('log');
  config = app.get('config');
  ddfModels = app.get('ddfModels');

  return {
    resolvePathToDdfFolder,
    createTransaction,
    createDataset,
    updateTransaction,
    createConcepts,
    createEntities,
    createDataPoints,
    _createDataPoints,
    findDataset,
    findVersion,
    getAllConcepts: _getAllConcepts,
    findAllEntities: _findAllEntities,
    processOriginalEntities: _processOriginalEntities,
    mapDdfOriginalEntityToWsModel: mapDdfOriginalEntityToWsModel,
    createOriginalEntities: __createOriginalEntities,
    findAllOriginalEntities: _findAllOriginalEntities,
    createEntitiesBasedOnOriginalEntities: _createEntitiesBasedOnOriginalEntities,
    clearOriginalEntities: _clearOriginalEntities,
    addEntityDrillups: _addEntityDrillups,
    createTranslations,
    findDataPoints,
    processRawDataPoints: __processRawDataPoints,
    parseFilename: _parseFilename,
    createEntitiesBasedOnDataPoints: _createEntitiesBasedOnDataPoints,
    updateConceptsDimensions: _updateConceptsDimensions,
    closeTransaction: closeTransaction,
    addConceptSubsetOf: _addConceptSubsetOf
  };
};

function resolvePathToDdfFolder(pipe, done) {
  pipe.pathToDdfFolder = reposService.getPathToRepo(pipe.datasetName, pipe.config);
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
    commit: pipe.commit,
  }, (err, res) => {
    pipe.transaction = res.toObject();
    return done(err, pipe);
  });
}

function closeTransaction(pipe, done) {
  logger.info('close transaction');

  mongoose.model('DatasetTransactions').update({
    _id: pipe.transaction._id
  }, {$set: {isClosed: true}}, (err) => {
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
    pipe.dataset = res;
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

  async.waterfall([
    async.constant({transaction: pipe.transaction, dataset: pipe.dataset, resolvePath: pipe.resolvePath}),
    _loadConcepts,
    _createConcepts,
    _getAllConcepts,
    _addConceptSubsetOf,
    _addConceptDomains,
    _getAllConcepts
  ], (err, res) => {
    pipe.concepts = res.concepts;
    return done(err, pipe);
  });
}

function _loadConcepts(pipe, done) {
  logger.info('** load concepts');

  return readCsvFile(pipe.resolvePath('ddf--concepts.csv'), {}, (err, res) => {
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
    _.chunk(pipe.raw.concepts, 100),
    LIMIT_NUMBER_PROCESS,
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
    dataset: pipe.datasetId || pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
  }, null, {
    join: {
      domain: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      },
      subsetOf: {
        $find: {
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
      },
      dimensions: {
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
      pipe.concepts = _.keyBy(res, 'gid');
      return done(err, pipe);
    });
}

function _addConceptSubsetOf(pipe, done) {
  logger.info('** add concept subsetOf');

  async.eachLimit(pipe.raw.subsetOf, LIMIT_NUMBER_PROCESS, __updateConceptSubsetOf, (err) => {
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
        'properties.drill_up': gid,
        dataset: pipe.datasetId || pipe.dataset._id,
        transaction: pipe.transactionId || pipe.transaction._id
      },
      {$addToSet: {'subsetOf': concept._id}},
      {multi: true},
      escb
    );
  }
}

function _addConceptDomains(pipe, done) {
  logger.info('** add entity domains to related concepts');

  async.eachLimit(pipe.raw.domains, LIMIT_NUMBER_PROCESS, __updateConceptDomain, (err) => {
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
        'properties.domain': gid,
        dataset: pipe.datasetId || pipe.dataset._id,
        transaction: pipe.transactionId || pipe.transaction._id
      },
      {$set: {'domain': concept._id}},
      {multi: true},
      escb
    );
  }
}

function createTranslations(pipe, done) {
  logger.info('create translations');

  let domain = pipe.concepts['translations'];
  if (!domain || domain.type !== 'entity_domain') {
    logger.warn('There is no translations domain! Go to next step.');
    return done(null, pipe);
  }

  var translations = []
    .concat(map(pipe.ddfEnTranslations, 'en'))
    .concat(map(pipe.ddfSeTranslations, 'se'));

  return async.eachLimit(
    _.chunk(translations, 100),
    LIMIT_NUMBER_PROCESS,
    _createEntities,
    (err) => {
      return done(err, pipe);
    }
  );

  function _createEntities(chunk, cb) {
    return mongoose.model('Entities').create(chunk, cb);
  }

  function map(json, lang) {
    return _.reduce(json, function (res, value, key) {
      let concept = pipe.concepts[lang];
      if (!concept || concept.type !== 'entity_set' || concept.domain.gid !== 'translations') {
        logger.warn(`There is no entity set with gid '${lang}'!`);
      }

      res.push({
        gid: key,
        title: value,
        sources: [`${lang}.json`],
        properties: {
          key: key,
          value: value,
          language: lang,
          lng_key: key,
          lng_value: value
        },
        domain: domain.originId,
        sets: concept ? [concept.originId] : [],
        from: pipe.transaction.createdAt,
        dataset: pipe.dataset._id,
        transaction: pipe.transactionId || pipe.transaction._id
      });
      return res;
    }, []);
  }
}

function createEntities(pipe, done) {
  logger.info('start process creating entities');
  let _pipe = {
    transaction: pipe.transaction,
    concepts: pipe.concepts,
    dataset: pipe.dataset,
    fileTemplates: pipe.fileTemplates,
    resolvePath: pipe.resolvePath
  };

  async.waterfall([
    async.constant(_pipe),
    _processOriginalEntities,
    _findAllOriginalEntities,
    _createEntitiesBasedOnOriginalEntities,
    _clearOriginalEntities,
    _findAllEntities,
    _addEntityDrillups,
    _findAllEntities
  ], (err, res) => {
    pipe.entities = res.entities;
    return done(err, pipe);
  });
}

function _processOriginalEntities(pipe, done) {
  // Entities could be in many files with duplicates
  // so for handling this case, we need to add all of them
  // in temporaty collection OriginalEntities
  // and then analyze and merge all duplicates
  logger.info('** process original entities');

  let entitySets = _.filter(pipe.concepts, concept => defaultEntityGroupTypes.indexOf(concept.type) > -1);

  async.eachLimit(
    entitySets,
    LIMIT_NUMBER_PROCESS,
    _processEntities(pipe),
    err => done(err, pipe)
  );

  function _processEntities(pipe) {
    return (entitySet, cb) => async.waterfall([
      async.constant({
        entitySet: entitySet,
        concepts: pipe.concepts,
        transaction: pipe.transaction,
        dataset: pipe.dataset,
        resolvePath: pipe.resolvePath,
        fileTemplates: pipe.fileTemplates
      }),
      __loadOriginalEntities,
      __createOriginalEntities
    ], cb);
  }
}

function __loadOriginalEntities(_pipe, cb) {
  _pipe.filename = _pipe.entitySet.domain
    ? _pipe.fileTemplates.getFilenameOfEntitySetEntities(_pipe.entitySet)
    : _pipe.fileTemplates.getFilenameOfEntityDomainEntities(_pipe.entitySet);

  logger.info(`**** load original entities from file ${_pipe.filename}`);

  readCsvFile(_pipe.resolvePath(_pipe.filename), {}, (err, res) => {
    let originalEntities = _.map(res, mapDdfOriginalEntityToWsModel(_pipe));
    let uniqOriginalEntities = _.uniqBy(originalEntities, 'gid');

    if (uniqOriginalEntities.length !== originalEntities.length) {
      return cb('All entity gid\'s should be unique within the Entity Set or Entity Domain!');
    }

    _pipe.raw = {
      originalEntities
    };
    return cb(err, _pipe);
  });
}

function __createOriginalEntities(pipe, done) {
  if (_.isEmpty(pipe.raw.originalEntities)) {
    logger.warn(`file '${pipe.filename}' is empty or doesn't exist.`);

    return async.setImmediate(() => done(null, pipe));
  }

  logger.info(`**** create original entities from file '${pipe.filename}'`);

  return async.eachSeries(
    _.chunk(pipe.raw.originalEntities, 100),
    ___createOriginalEntities,
    (err) => {
      return done(err, pipe);
    }
  );

  function ___createOriginalEntities(chunk, cb) {
    return mongoose.model('OriginalEntities').create(chunk, (err) => {
      return cb(err);
    });
  }
}

function _findAllOriginalEntities(pipe, done) {
  logger.info('** find all original entities');

  mongoose.model('OriginalEntities').find({
    dataset: pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
  })
    .populate('dataset')
    .populate('transaction')
    .lean()
    .exec((err, res) => {
      pipe.originalEntities = res;
      return done(err, pipe);
    });
}

function _createEntitiesBasedOnOriginalEntities(pipe, done) {
  if (_.isEmpty(pipe.originalEntities)) {
    logger.warn(`There is no original entities.`);

    return async.setImmediate(() => done(null, pipe));
  }

  logger.info(`** create entities based on original entities`);

  // let entities = _.chain(pipe.originalEntities)
  //   .groupBy('gid')
  //   .flatMap(mapDdfEntityBasedOnOriginalEntityToWsModel(pipe.concepts))
  //   .value();

  // FIXME: REMOVE ALL REFERENCE TO ORIGINAL ENTITIES FROM IMPORT AND INCREMENTAL UPDATE
  return async.each(_.chunk(pipe.originalEntities, 100), _createEntities, (err) => {
    return done(err, pipe);
  });

  function _createEntities(chunk, cb) {
    return mongoose.model('Entities').create(chunk, (err) => {
      return cb(err);
    });
  }
}

function _clearOriginalEntities(pipe, cb) {
  logger.info('** clear original entities');

  mongoose.model('OriginalEntities').remove({
    dataset: pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
  }, err => {
    return cb(err, pipe);
  });
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
  async.forEachOfLimit(relations, LIMIT_NUMBER_PROCESS, (drillups, _id, escb) => {
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

function _parseFilename(pipe, cb) {
  logger.info(`** parse filename '${pipe.filename}'`);

  let parsedFileName = pipe.filename.replace(/^ddf--datapoints--|\.csv$/g, '').split('--by--');
  let measureGids = _.first(parsedFileName).split('--');
  let dimensionGids = _.last(parsedFileName).split('--');

  pipe.measures = _.pick(pipe.concepts, measureGids);
  pipe.dimensions = _.pick(pipe.concepts, dimensionGids);

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
      .reduce((result, entity) => {
        _.each(pipe.dimensions, (concept) => {
          let domain = concept.domain || concept;

          if (!dictionary[entity[concept.gid]] && !gids.has(entity[concept.gid])) {
            let mappedEntity = mapDdfEntityToWsModel(entity, concept, domain, pipe);
            result.push(mappedEntity);
            gids.add(entity[concept.gid]);
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
  }
}

function _createEntitiesBasedOnDataPoints(pipe, cb) {
  if (_.isEmpty(pipe.raw.entities)) {
    logger.log(`** There is no new entities in data points file.`);

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

  async.eachSeries(_.chunk(dataPoints, 100), (dataPoint, plcb) => {
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
    LIMIT_NUMBER_PROCESS,
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
  }
}

function ___getAllEntitiesByMeasure(pipe, cb) {
  return mongoose.model('DataPoints').distinct(
    'dimensions',
    {
      measure: pipe.measure.originId,
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
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
      originId: {$in: pipe.originIdsOfEntities},
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
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
      originId: {$in: pipe.originIdsOfEntities},
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id,
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
      originId: pipe.measure.originId,
      dataset: pipe.datasetId || pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id
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

function findVersion(pipe, done) {
  mongoose.model('DatasetTransactions').findOne({})
    .lean()
    .exec((err, res) => {
      pipe.transaction = res;
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
    // .limit(5)
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

      from: pipe.transaction.createdAt,
      to: MAX_VALUE,
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id
    };
  };
}

function mapDdfOriginalEntityToWsModel(pipe) {
  return (entry) => {
    let gid = passGeoMapping(pipe, entry);
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

    return {
      gid: gid,
      title: _entry.name,
      sources: [pipe.filename],
      properties: _entry,

      originId: _entry.originId,
      domain: pipe.entitySet.domain ? pipe.entitySet.domain.originId : pipe.entitySet.originId,
      sets: resolvedSets,

      from: pipe.transaction.createdAt,
      dataset: pipe.dataset._id,
      transaction: pipe.transactionId || pipe.transaction._id
    };
  };
}

function mapDdfEntityBasedOnOriginalEntityToWsModel(concepts) {
  let conceptsById = _.mapKeys(concepts, '_id');

  return function mergeEntries(entries) {

    const leftovers = [];
    const mergedEntry = _mergeEntries(entries, leftovers, conceptsById);

    leftovers.push(mergedEntry);

    if (leftovers.length === entries.length) {
      return _.map(leftovers, item => _.omit(item, ['_id', '__v']));
    } else {
      return mergeEntries(leftovers);
    }
  };
}

function _mergeEntries(entries, leftovers, conceptsById) {
  return _.chain(entries)
    .reduce((result, entry) => {
      let isEntryAllowedToMerge = __checkEntryAllowedToMerge(result, entry, conceptsById);

      let isEntryAllowedToMergeResult = __checkEntryAllowedToMergeResult(result, entry, conceptsById);

      if (isEntryAllowedToMerge || isEntryAllowedToMergeResult) {
        result = _.mergeWith(result, entry, __customizer);
        result.isOwnParent = true;
      } else {
        leftovers.push(entry);
      }

      return result;
    })
    .value();
}

function __checkEntryAllowedToMerge(result, entry, conceptsById) {
  let usedConcepts = _.chain(conceptsById)
    .pick(conceptsById, entry.sets.map(_.toString))
    .mapKeys('gid')
    .keys()
    .value();

  return _.chain(entry.properties)
    .keys()
    .intersection(usedConcepts)
    .some(group => result.properties[group] === entry.gid)
    .value();
}

function __checkEntryAllowedToMergeResult(result, entry, conceptsById) {
  let usedConcepts = _.chain(conceptsById)
    .pick(conceptsById, result.sets.map(_.toString))
    .mapKeys('gid')
    .keys()
    .value();

  return _.chain(result.properties)
    .keys()
    .intersection(usedConcepts)
    .some(group => entry.properties[group] === result.gid)
    .value();
}

function __customizer(objValue, srcValue) {
  if (_.isArray(objValue)) {
    return _.chain(objValue)
      .concat(srcValue)
      .uniqWith(_.isEqual)
      .map(item => {
        return item._id || item;
      })
      .value();
  }
  return srcValue._id;
}

function mapDdfEntityToWsModel(entity, concept, domain, pipe) {
  let gid = process.env.USE_GEO_MAPPING === 'true' ? geoMapping[entity.gid] || entity.gid : entity.gid;

  return {
    gid: entity[concept.gid],
    title: gid,
    sources: [pipe.filename],
    properties: entity,

    // originId: entity.originId,
    domain: domain.originId,
    sets: concept.domain ? [] : [concept.originId],
    drillups: [],

    from: pipe.transaction.createdAt,
    dataset: pipe.dataset._id,
    transaction: pipe.transactionId || pipe.transaction._id
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
    let dimensions = _.chain(entry)
      .keys()
      .filter(conceptGid => _.keys(pipe.dimensions).indexOf(conceptGid) > -1)
      .reduce((result, conceptGid) => {
        let entity = _.find(pipe.entities, (_entity) => {
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
        return {
          value: entry[measureGid],
          measure: pipe.measures[measureGid].originId,
          dimensions: dimensions,
          originId: entry.originId,

          isNumeric: _.isNumber(entry[measureGid]),
          from: pipe.transaction.createdAt,
          dataset: pipe.dataset._id,
          transaction: pipe.transactionId || pipe.transaction._id
        }
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

function passGeoMapping(pipe, entry) {
  let _value = entry[pipe.entitySet.gid] || (pipe.entitySet.domain && entry[pipe.entitySet.domain.gid]);

  if (!_value) {
    logger.warn(`Either '${pipe.entitySet.gid}' or '${pipe.entitySet.domain && pipe.entitySet.domain.gid}' columns weren't found in file '${pipe.filename}'`);
  }

  let gid = process.env.USE_GEO_MAPPING === 'true' ? geoMapping[_value] || _value : _value;

  return gid;
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
