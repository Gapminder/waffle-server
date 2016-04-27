/*eslint camelcase: 0*/
'use strict';

console.time('done');
// Converter Class
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Converter = require('csvtojson').Converter;

const metadata = require('./vizabi/metadata.json');
const mongoose = require('mongoose');

// geo mapping
const geoMapping = require('./geo-mapping.json');
const defaultEntityGroupTypes = ['entity_domain', 'entity_set', 'time', 'age'];
const defaultMeasureTypes = ['measure'];

// take from args
let logger;
let config;
let ddfModels;
let pathToDdfFolder;
let resolvePath;
let ddfConceptsFile;
let ddfEntitiesFileTemplate;

module.exports = function (app, done) {
  logger = app.get('log');
  config = app.get('config');
  ddfModels = app.get('ddfModels');

  pathToDdfFolder = config.PATH_TO_DDF_FOLDER;
  resolvePath = (filename) => path.resolve(pathToDdfFolder, filename);
  ddfConceptsFile = resolvePath('ddf--concepts.csv');
  ddfEntitiesFileTemplate = _.template('ddf--entities--${ (domain && domain.gid + "--") || "" }${ gid }.csv');

  let pipe = {
    ddfConceptsFile,
    raw: {},
    defaultEntityGroupTypes,
    defaultMeasureTypes,
    pathToDdfFolder
  };

  async.waterfall([
    async.constant(pipe),
    clearAllDbs,
    createUser,
    createDataset,
    createVersion,
    createTransaction,
    loadConcepts,
    createConcepts,
    findAllConcepts,
    addConceptDrillups,
    addConceptDrilldowns,
    addConceptDomains,
    findAllConcepts,
    processOriginalEntities,
    findAllOriginalEntities,
    createEntitiesBasedOnOriginalEntities,
    findAllEntities,
    addEntityChildOf,
    createDataPoints
  ], (err) => {
    console.timeEnd('done');
    return done(err);
  });
};

function clearAllDbs(pipe, cb) {
  if (process.env.CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT === 'true') {
    logger.info('clear all collections');

    let collectionsFn = _.map(ddfModels, model => {
      let modelName = _.chain(model).camelCase().upperFirst();
      return _cb => mongoose.model(modelName).remove({}, _cb);
    });

    return async.parallel(collectionsFn, (err) => cb(err, pipe));
  }

  return cb(null, pipe);
}

function createUser(pipe, done) {
  logger.info('create user');

  mongoose.model('Users').create({
    name: 'Vasya Pupkin',
    email: 'email@email.com',
    username: 'VPup',
    password: 'VPup'
  }, (err, res) => {
    pipe.user = res;
    return done(err, pipe);
  });
}

function createDataset(pipe, done) {
  logger.info('create data set');

  mongoose.model('Datasets').create({
    dsId: 'ddf-gapminder-world-v2',
    type: 'local',
    url: pathToDdfFolder,
    dataProvider: 'semio',
    defaultLanguage: 'en',
    createdBy: pipe.user._id
  }, (err, res) => {
    pipe.dataset = res;
    return done(err, pipe);
  });
}

function createVersion(pipe, done) {
  logger.info('create version');

  mongoose.model('DatasetVersions').create({
    name: Math.random().toString(),
    createdBy: pipe.user._id,
    dataset: pipe.dataset._id
  }, (err, res) => {
    pipe.version = res;
    return done(err, pipe);
  });
}

function createTransaction(pipe, done) {
  logger.info('create session');

  mongoose.model('DatasetTransactions').create({
    version: pipe.version._id,
    createdBy: pipe.user._id
  }, (err, res) => {
    pipe.session = res;
    return done(err, pipe);
  });
}

function loadConcepts(pipe, done) {
  logger.info('load concepts');

  return readCsvFile('ddf--concepts.csv', {}, (err, res) => {
    let concepts = _.map(res, mapDdfConceptsToWsModel(pipe));
    let uniqConcepts = _.uniqBy(concepts, 'gid');

    if (uniqConcepts.length !== concepts.length) {
      return done('All concept gid\'s should be unique within the dataset!');
    }

    pipe.raw.concepts = concepts;
    pipe.raw.drillups = reduceUniqueNestedValues(concepts, 'properties.drill_up');
    pipe.raw.drilldowns = reduceUniqueNestedValues(concepts, 'properties.drill_down');
    pipe.raw.domains = reduceUniqueNestedValues(concepts, 'properties.domain');
    return done(err, pipe);
  });
}

function createConcepts(pipe, done) {
  logger.info('create concepts');

  mongoose.model('Concepts').create(pipe.raw.concepts, (err) => {
    return done(err, pipe);
  });
}

function findAllConcepts(pipe, done) {
  logger.info('find all concepts');

  mongoose.model('Concepts').find({})
    .populate('domain')
    .populate('drillups')
    .populate('drilldowns')
    .populate('versions')
    .populate('previous')
    .lean()
    .exec((err, res) => {
      pipe.concepts = res;
      return done(err, pipe);
    });
}

function addConceptDrillups(pipe, done) {
  logger.info('add concept drillups');

  async.eachLimit(pipe.raw.drillups, 10, (drillup, escb) => {
    let drillupConcept = _.find(pipe.concepts, {gid: drillup});

    if (!drillupConcept) {
      logger.warn(`Drill up concept gid '${drillup}' isn't exist!`);
      return async.setImmediate(escb);
    }

    mongoose.model('Concepts').update(
      {'properties.drill_up': drillup},
      {$addToSet: {'drillups': drillupConcept._id}},
      {multi: true},
      escb
    );
  }, (err) => {
    return done(err, pipe);
  });
}

function addConceptDrilldowns(pipe, done) {
  logger.info('add concept drilldowns');

  async.eachLimit(pipe.raw.drilldowns, 10, (drilldown, escb) => {
    let drilldownConcept = _.find(pipe.concepts, {gid: drilldown});

    if (!drilldownConcept) {
      logger.warn(`Drill down concept gid '${drilldown}' isn't exist!`);
      return async.setImmediate(escb);
    }

    mongoose.model('Concepts').update(
      {'properties.drill_down': drilldown},
      {$addToSet: {'drilldowns': drilldownConcept._id}},
      {multi: true},
      escb
    );
  }, (err) => {
    return done(err, pipe);
  });
}

function addConceptDomains(pipe, done) {
  logger.info('add entity domains to related concepts');

  async.eachLimit(pipe.raw.domains, 10, (domainName, escb) => {
    let domain = _.find(pipe.concepts, {gid: domainName});

    if (!domain) {
      logger.warn(`Entity domain concept gid '${domainName}' isn't exist!`);
      return async.setImmediate(escb);
    }

    mongoose.model('Concepts').update(
      {'properties.domain': domainName},
      {$set: {'domain': domain._id}},
      {multi: true},
      escb
    );
  }, (err) => {
    return done(err, pipe);
  });
}

function processOriginalEntities(pipe, done) {
  let entityGroups = _.filter(pipe.concepts, concept => defaultEntityGroupTypes.indexOf(concept.type) > -1);

  async.eachLimit(
    entityGroups,
    10,
    _processEntities(pipe),
    (err) => {
      return done(err, pipe);
    });

  function _processEntities(pipe) {
    return (eg, cb) => async.waterfall([
      async.constant({eg, concepts: pipe.concepts, version: pipe.version}),
      loadOriginalEntities,
      createOriginalEntities
    ], cb);
  }
}

function loadOriginalEntities(_pipe, cb) {
  logger.info(`load entities for ${_pipe.eg.gid} from file ${ddfEntitiesFileTemplate(_pipe.eg)}`);

  readCsvFile(ddfEntitiesFileTemplate(_pipe.eg), {}, (err, res) => {
    let originalEntities = _.map(res, mapDdfOriginalEntityToWsModel(_pipe));
    let uniqOriginalEntities = _.uniqBy(originalEntities, 'gid');

    if (uniqOriginalEntities.length !== originalEntities.length) {
      return done('All entity gid\'s should be unique within the Entity Set or Entity Domain!');
    }

    _pipe.raw = {originalEntities};
    return cb(err, _pipe);
  });
}

function createOriginalEntities(_pipe, cb) {
  if (_.isEmpty(_pipe.raw.originalEntities)) {
    logger.warn(`file '${ddfEntitiesFileTemplate(_pipe.eg)}' is empty or doesn't exist.`);

    return async.setImmediate(cb);
  }

  logger.info(`create original entities from file ${ddfEntitiesFileTemplate(_pipe.eg)}`);

  mongoose.model('OriginalEntities').create(_pipe.raw.originalEntities, (err) => {
    return cb(err, _pipe);
  });
}

function findAllOriginalEntities(pipe, done) {
  logger.info('find all original entities');

  mongoose.model('OriginalEntities').find({})
    .populate('domain')
    .populate('groups')
    .populate('versions')
    .lean()
    .exec((err, res) => {
      pipe.originalEntities = res;
      return done(err, pipe);
    });
}

function createEntitiesBasedOnOriginalEntities(pipe, cb) {
  if (_.isEmpty(pipe.originalEntities)) {
    logger.warn(`There is no original entities.`);

    return async.setImmediate(() => cb(null, pipe));
  }

  logger.info(`create entities based on original entities`);
  let entities = _.chain(pipe.originalEntities)
    .groupBy('gid')
    .flatMap(mapDdfEntityBasedOnOriginalEntityToWsModel())
    .value();

  mongoose.model('Entities').create(entities, (err) => {
    return cb(err, pipe);
  });
}

function createEntities(pipe, cb) {
  if (_.isEmpty(pipe.raw.entities)) {
    logger.warn(`There is no original entities.`);

    return async.setImmediate(() => cb(null, pipe));
  }

  logger.info(`create entities`);
  let entities = _.chain(pipe.raw.entities)
    .groupBy('gid')
    .map(mapDdfEntityToWsModel(pipe))
    .value();
pipe.entities = entities;
  mongoose.model('Entities').create(entities, (err) => {
    return cb(err, pipe);
  });
}

function findAllEntities(pipe, done) {
  logger.info('find all entities');

  mongoose.model('Entities').find({})
    .populate('domain')
    .populate('groups')
    .populate('childOf')
    .populate('versions')
    .populate('previous')
    .lean()
    .exec((err, res) => {
      pipe.entities = res;
      return done(err, pipe);
    });
}

function addEntityChildOf(pipe, done) {
  logger.info('add entity childOf');
  let relations = flatEntityRelations(pipe);

  async.forEachOfLimit(relations, 10, (childOf, _id, escb) => {
    mongoose.model('Entities').update(
      {_id: _id},
      {$addToSet: {'childOf': {$each: childOf}}},
      {multi: true},
      escb
    );
  }, (err) => {
    return done(err, pipe);
  });
}

function createDataPoints(pipe, done) {

  fs.readdir(path.resolve(pathToDdfFolder), (err, _fileNames) => {
    const fileNames = _fileNames.filter(fileName => /^ddf--datapoints--/.test(fileName));

    async.eachSeries(
      fileNames,
      processDataPoints(pipe),
      (err) => {
        return done(err, pipe);
      });
  });

  function processDataPoints(pipe) {
    return (fileName, cb) => async.waterfall([
      async.constant({fileName, concepts: pipe.concepts, version: pipe.version}),
      _parseFileName,
      _updateConceptsDimensions,
      findAllEntities,
      _loadDataPoints,
      createEntities,
      findAllEntities,
      _createDataPoints
    ], cb);
  }

  function _parseFileName(_pipe, cb) {
    let parsedFileName = _pipe.fileName.replace(/^ddf--datapoints--|\.csv$/g, '').split('--by--');
    let measureGids = _.first(parsedFileName).split('--');
    let dimensionGids = _.last(parsedFileName).split('--');
    _pipe.measures = _.chain(_pipe.concepts)
      .filter(concept => measureGids.indexOf(concept.gid) > -1)
      .keyBy('gid')
      .value();
    _pipe.dimensions = _.chain(_pipe.concepts)
      .filter(concept => dimensionGids.indexOf(concept.gid) > -1)
      .keyBy('gid')
      .value();

    return async.setImmediate(() => cb(null, _pipe));
  }

  function _updateConceptsDimensions(_pipe, cb) {
    if (_.isEmpty(_pipe.dimensions)) {
      logger.warn(`file '${ddfEntitiesFileTemplate(_pipe.fileName)}' doesn't have any dimensions.`);

      return async.setImmediate(cb);
    }

    logger.info(`update property dimension of concept`);

    let dimensions = _.chain(_pipe.dimensions).mapValues(dm => dm._id).values().value();

    mongoose.model('Concepts').update(
      {gid: {$in: _.keys(_pipe.measures)} },
      {$addToSet: {dimensions: {$each: dimensions}}},
      (err) => {
        return cb(err, _pipe);
      });
  }

  function _loadDataPoints(_pipe, cb) {
    logger.info(`load datapoints for measure(s) '${_.keys(_pipe.measures)}' from file ${_pipe.fileName}`);

    readCsvFile(_pipe.fileName, {}, (err, res) => {
      let mapEntities = entry => _.chain(_pipe.dimensions)
        .keys()
        .map(entityGroupGid => {
          let domain = _pipe.dimensions[entityGroupGid].domain
            ? _pipe.dimensions[entityGroupGid].domain._id
            : _pipe.dimensions[entityGroupGid]._id;

          return {
            gid: entry[entityGroupGid],
            source: _pipe.fileName,
            domain: domain,
            groups: _pipe.dimensions[entityGroupGid].domain ? [_pipe.dimensions[entityGroupGid]._id] : [],
            versions: [_pipe.version._id]
          };
        })
        .value();

      let entities = _.chain(res)
        .flatMap(mapEntities)
        .uniqWith(_.isEqual)
        .filter(entity => !_.find(_pipe.entities, {gid: entity.gid}))
        .value();

      _pipe.raw = {
        dataPoints: res,
        entities: entities
      };

      return cb(err, _pipe);
    });
  }

  function _createDataPoints(_pipe, cb) {
    let dataPoints = _.flatMap(_pipe.raw.dataPoints, mapDdfDataPointToWsModel(_pipe));

    if (_.isEmpty(dataPoints)) {
      logger.error(`file '${ddfEntitiesFileTemplate(_pipe.fileName)}' is empty or doesn't exist.`);

      return async.setImmediate(cb);
    }

    logger.info(`create data points`);

    mongoose.model('DataPoints').create(dataPoints, (err) => {
      return cb(err, _pipe);
    });
  }
}

//*** Mappers ***
function mapDdfConceptsToWsModel(pipe) {
  return function (entry, rowNumber) {
    let _entry = validateConcept(entry, rowNumber);

    return {
      gid: _entry.concept,

      name: _entry.name,
      type: _entry.concept_type,

      tooltip: _entry.tooltip,
      link: _entry.indicator_url,

      tags: _entry.tags,
      color: _entry.color,
      domain: null,
      unit: _entry.unit,
      scales: _entry.scales,

      drillups: [],
      drilldowns: [],

      properties: _entry,
      versions: [pipe.version._id]
    };
  };
}

function mapDdfOriginalEntityToWsModel(pipe) {
  return (entry) => {
    let gid = passGeoMapping(pipe, entry);
    let resolvedColumns = mapResolvedColumns(entry);
    let resolvedGroups = mapResolvedGroups(pipe, _.first(resolvedColumns));

    return {
      gid: gid,
      title: entry.name,
      sources: [ddfEntitiesFileTemplate(pipe.eg)],
      properties: entry,

      domain: pipe.eg.domain ? pipe.eg.domain._id : pipe.eg._id,
      groups: resolvedGroups,

      versions: [pipe.version._id]
    };
  };
}

function mapDdfEntityBasedOnOriginalEntityToWsModel() {
  return function mergeEntries(entries) {


    const leftovers = [];
    const mergedEntry = _.chain(entries)
      .reduce((result, entry) => {
        let groups = _.map(entry.groups, 'gid');
        let groupsResult = _.map(result.groups, 'gid');

        let isEntryAllowedToMerge = _.chain(entry.properties)
          .keys()
          .intersection(groups)
          .some(group => {
            return result.properties[group] === entry.gid;
          })
          .value();

        let isEntryAllowedToMergeResult = _.chain(result.properties)
          .keys()
          .intersection(groupsResult)
          .some(group => {
            return entry.properties[group] === result.gid;
          })
          .value();

        if (isEntryAllowedToMerge || isEntryAllowedToMergeResult) {
          result = _.mergeWith(result, entry, customizer);
          result.isOwnParent = true;
        } else {
          leftovers.push(entry);
        }

        return result;
      })
      .value();

    leftovers.push(mergedEntry);

    if (leftovers.length === entries.length) {
      return _.map(leftovers, item => _.omit(item, ['_id', '__v']));
    } else {
      return mergeEntries(leftovers);
    }

    // let gid  = _.first(entries).gid;
    // let _result = _.partition(entries, (entry) => {
    //   let groups = _.map(entry.groups, 'gid');
    //   return _.chain(entry.properties)
    //     .keys()
    //     .intersection(groups)
    //     .some(group => {
    //       return entry.properties[group] === gid;
    //     })
    //     .value();
    // });
    //
    // let result = _.chain(_result)
    //   .first()
    //   .reduce((result, current) => {
    //     return _.mergeWith(result, current, customizer);
    //   })
    //   .value();
    //
    // if (_.first(_result).length > 1) {
    //   result.isOwnParent = true;
    // }
    //
    // return _.chain(result)
    //   .concat(_.last(_result))
    //   .map(item => _.omit(item, ['_id', '__v']))
    //   .value();

    function customizer(objValue, srcValue) {
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
  };
}

function mapDdfEntityToWsModel(pipe) {
  return (entry) => {
    let _entry = _.first(entry);
    let egGid = _.findKey(pipe.dimensions, (dm) => {
      return dm._id.toString() === _entry.domain.toString() ||
        dm._id.toString() === _.first(_entry.groups).toString();
    });
    pipe.eg = pipe.dimensions[egGid];
    let gid = process.env.USE_GEO_MAPPING === 'true' ? geoMapping[_entry.gid] || _entry.gid : _entry.gid;
    let resolvedColumns = mapResolvedColumns(_entry);
    let resolvedGroups = mapResolvedGroups(pipe, resolvedColumns);

    return {
      gid: gid,
      title: _entry.name,
      source: ddfEntitiesFileTemplate(pipe.eg),
      properties: _entry,

      domain: pipe.eg.domain ? pipe.eg.domain._id : pipe.eg._id,
      groups: resolvedGroups,
      childOf: [],

      versions: [pipe.version._id]
    };
  };
}

function mapResolvedGroups(pipe, resolvedGids) {
  return _.chain(pipe.concepts)
    .filter(concept => defaultEntityGroupTypes.indexOf(concept.type) > -1 && resolvedGids === `is--${concept.gid}`)
    .filter(concept => concept.type !== 'entity_domain')
    .map(concept => concept._id)
    // .union([pipe.eg.domain ? pipe.eg.domain._id : pipe.eg._id])
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
      .every(value => !_.isNil(value))
      .value();


    if (!isValidEntry) {
      logger.error(`[${key}] Validation error: There is empty value(s) in file '${pipe.fileName}'`);
      return [];
    }

    let dimensions = _.chain(entry)
      .keys()
      .filter(conceptGid => _.keys(pipe.dimensions).indexOf(conceptGid) > -1)
      .reduce((result, conceptGid) => {
        let entity = _.find(pipe.entities, (_entity) => {
          return _entity.gid == entry[conceptGid];
        });

        result.push({
          gid: entry[conceptGid],
          conceptGid: conceptGid,
          concept: pipe.dimensions[conceptGid]._id,
          entity: entity._id
        });

        return result;
      }, [])
      .value();

    return _.chain(entry)
      .keys()
      .filter(conceptGid => _.keys(pipe.measures).indexOf(conceptGid) > -1)
      .map((measureGid) => {
        return {
          value: entry[measureGid],
          measure: pipe.measures[measureGid]._id,
          measureGid: measureGid,

          dimensions: dimensions,
          versions: [pipe.version._id],
        }
      })
      .value();
  };
}

//*** Validators ***
function validateConcept(entry, rowNumber) {
  let resolvedJSONColumns = ['color', 'scales', 'drill_up', 'drill_down'];
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
  let _value = entry[pipe.eg.gid] || (pipe.eg.domain && entry[pipe.eg.domain.gid]);

  if (!_value) {
    logger.warn(`Either '${pipe.eg.gid}' or '${pipe.eg.domain && pipe.eg.domain.gid}' columns weren't found in file '${ddfEntitiesFileTemplate(pipe.eg)}'`);
  }

  let gid = process.env.USE_GEO_MAPPING === 'true' ? geoMapping[_value] || _value : _value;

  return gid;
}

function flatEntityRelations(pipe) {
  return _.chain(pipe.entities)
    .reduce((result, entity) => {
      let conceptsGids = _.chain(entity.properties)
        .keys()
        .filter(conceptGid => _.some(pipe.concepts, {'gid': conceptGid, 'type': 'entity_set'}) && entity.properties[conceptGid] !== entity.gid)
        .value();
      let resolvedEntitiesByConcepts = _getAllEntitiesByConcepts(pipe, conceptsGids, entity);

      result[entity._id] = _.map(resolvedEntitiesByConcepts, '_id');

      if (entity.isOwnParent) {
        result[entity._id].push(entity._id);
      }

      return result;
    }, {})
    .value();

  function _getAllEntitiesByConcepts(pipe, conceptsGids, entity) {
    return _.map(conceptsGids, conceptGid => _getEntityOfCertainConcept(pipe, conceptGid, entity));
      // .map((result, conceptGid) => {
      //   let parentEntities = _getEntitiesOfCertainConcept(pipe, conceptGid);
      //   result[conceptGid] = parentEntities;
      //   return result;
      // }, {})
      // .filter(parentEntity => entity.properties[parentEntity.conceptGid])
      // .value();
  }

  function _getEntityOfCertainConcept(pipe, conceptGid, entity) {
    return _.chain(pipe.entities)
      .find(e => _.some(e.groups, group => group.gid === conceptGid && entity.properties[conceptGid] === e.gid))
      .value();
  }
}

function readCsvFile(file, options, cb) {
  const converter = new Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(resolvePath(file), (err, data) => {
    if (err && err.toString().indexOf("cannot be found.") > -1) {
      logger.warn(err);
    }
    if (err && err.toString().indexOf("cannot be found.") === -1) {
      logger.error(err);
    }

    return cb(null, data);
  });
}
