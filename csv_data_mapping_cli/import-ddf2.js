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
    processEntities,
    findAllEntities,
    addEntityChildOf,
    findAllEntities,
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
      console.error(`Drill up concept gid '${drillup}' isn't exist!`);
      return async.setImmediate(escb);
    }

    mongoose.model('Concepts').update(
      {'properties.drill_up': drillup},
      {$addToSet: {'drillups': drillupConcept._id}},
      {multi: true},
      escb
    );
  }, (err, res) => {
    // console.log('addConceptDrillups', res);
    return done(err, pipe);
  });
}

function addConceptDrilldowns(pipe, done) {
  logger.info('add concept drilldowns');

  async.eachLimit(pipe.raw.drilldowns, 10, (drilldown, escb) => {
    let drilldownConcept = _.find(pipe.concepts, {gid: drilldown});

    if (!drilldownConcept) {
      console.error(`Drill down concept gid '${drilldown}' isn't exist!`);
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
      console.error(`Entity domain concept gid '${domainName}' isn't exist!`);
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

function processEntities(pipe, done) {
  let entityGroups = _.filter(pipe.concepts, concept => defaultEntityGroupTypes.indexOf(concept.type) > -1);

  async.eachLimit(
    entityGroups,
    10,
    _processEntities(pipe),
    (err, res) => {
      // console.log('createEntities', res);
      return done(err, pipe);
    });

  function _processEntities(pipe) {
    return (eg, cb) => async.waterfall([
      async.constant({eg, concepts: pipe.concepts, version: pipe.version}),
      loadEntities,
      createEntities
    ], cb);
  }
}

function loadEntities(_pipe, cb) {
  logger.info(`load entities for ${_pipe.eg.gid} from file ${ddfEntitiesFileTemplate(_pipe.eg)}`);

  readCsvFile(ddfEntitiesFileTemplate(_pipe.eg), {}, (err, res) => {
    let entities = _.map(res, mapDdfEntityToWsModel(_pipe));
    let uniqEntities = _.uniqBy(entities, 'gid');

    if (uniqEntities.length !== entities.length) {
      return done('All entity gid\'s should be unique within the Entity Set or Entity Domain!');
    }

    _pipe.raw = {entities};
    return cb(err, _pipe);
  });
}

function createEntities(_pipe, cb) {
  if (_.isEmpty(_pipe.raw.entities)) {
    logger.error(`file '${ddfEntitiesFileTemplate(_pipe.eg)}' is empty or doesn't exist.`);

    return async.setImmediate(cb);
  }

  logger.info(`create entities`);

  mongoose.model('Entities').create(_pipe.raw.entities, (err) => {
    return cb(err, _pipe);
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
  let relations = flatEntityRelations(pipe.entities);

  async.eachLimit(relations, 10, (relation, escb) => {
    let parent = _.find(pipe.entities, {gid: relation.parentEntityGid});

    if (!parent) {
      console.error(`Entity parent with gid '${relation.parentEntityGid}' of entity set with gid '${relation.entityGroupGid}' for entity child with gid '${relation.childEntityGid}' isn't exist!`);
      return async.setImmediate(escb);
    }

    let query = {};
    query['properties.' + relation.entityGroupGid] = relation.parentEntityGid;

    mongoose.model('Entities').update(
      {gid: relation.childEntityGid},
      {$addToSet: {'childOf': parent._id}},
      {multi: true},
      escb
    );
  }, (err) => {
    return done(err, pipe);
  });
}

// Logic is a bit complicated
// so here is logic steps overview
// 1. for each measure entry from db
// 2. find corresponding entries in ddf index file
// 3. for each entry from ddf index (per measure)
// 4. read measure values from csv
// 5. find missing dimensions values in DB and add them
// 6. recheck that dimension values added correctly
// 7. save measure values to DB
function createDataPoints(pipe, done) {

  fs.readdir(path.resolve(pathToDdfFolder), (err, _fileNames) => {
    const fileNames = _fileNames.filter(fileName => /^ddf--datapoints--/.test(fileName));

    async.eachSeries(
      fileNames,
      processDataPoints(pipe),
      (err, res) => {
        // console.log('createEntities', res);
        return done(err, pipe);
      });
  });

  function processDataPoints(pipe) {
    return (fileName, cb) => async.waterfall([
      async.constant({fileName, concepts: pipe.concepts, version: pipe.version}),
      _parseFileName,
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

  function _loadDataPoints(_pipe, cb) {
    logger.info(`load datapoints for measure(s) '${_pipe.measureGids}' from file ${_pipe.fileName}`);

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

// Logic is a bit complicated
// so here is logic steps overview
// 1. for each measure entry from db
// 2. find corresponding entries in ddf index file
// 3. for each entry from ddf index (per measure)
// 4. read measure values from csv
// 5. find missing dimensions values in DB and add them
// 6. recheck that dimension values added correctly
// 7. save measure values to DB
// function createDataPoints() {
//   logger.info('Start: create indicator values');
//   return pipeWaterfall([
//     // load all measures and dimensions from DB
//     (pipe, pcb) => async.parallel({
//       measures: cb=> Indicators.find({}, {gid: 1}).lean().exec(cb),
//       dimensions: cb=> Dimensions.find({}, {gid: 1}).lean().exec(cb),
//       // filesIndex: cb=> readCsvFile(ddf_index_file)({}, cb),
//       fileList: cb => {
//         fs.readdir(path.resolve(pathToDdfFolder), (err, fileNames) => {
//           if (err) {
//             return cb(err);
//           }
//           const START_INDEX = 2;
//           const dataPoints = fileNames
//             .filter(fileName => /^ddf--datapoints--/.test(fileName))
//             .map(fileName => {
//               const spl = fileName.split(/--|\.{1}/);
//               const allConcepts = spl.slice(START_INDEX);
//               const posForBy = allConcepts.indexOf('by');
//               const details = {
//                 file: fileName,
//                 measure: allConcepts.slice(0, posForBy)[0],
//                 concepts: allConcepts.slice(posForBy + 1, allConcepts.length - 1),
//                 geo: 'country',
//                 time: 'year'
//               };
//               return details;
//             });
//           return cb(null, dataPoints);
//         });
//       }
//     }, pcb),
//     // group file entries from ddf-index my measure id
//     (pipe, cb) => {
//       // pipe.filesIndex = _.groupBy(pipe.filesIndex, v=>v.value_concept);
//       // todo: use this only for debugging to import single measure file
//       if (process.env.DEBUG_IMPORT) {
//         pipe.fileList.length = 1;
//       }
//       pipe.filesIndex = _.groupBy(pipe.fileList, v=>v.measure);
//       return cb(null, pipe);
//     },
//     // do all other? WTF? REALLY?
//     (mPipe, pcb) => {
//       // for each measure entry from DB
//       async.eachSeries(mPipe.measures, (measure, escb) => {
//         const pipe = Object.assign({}, mPipe, {measure});
//         // check entry in ddf-index.csv
//         if (!pipe.filesIndex[measure.gid]) {
//           // produce warning and exit
//           console.warn(`File for measure ${measure.gid} not found`/* in ${ddf_index_file}`*/);
//           return escb();
//         }
//
//         // for each measure entries from ddf-index.csv
//         async.eachSeries(pipe.filesIndex[measure.gid], (fileEntry, cb)=> {
//           if (!fileEntry.geo || !fileEntry.time) {
//             logger.info(`Skipping ${fileEntry.file} - already imported`);
//             return cb();
//           }
//           logger.info(`Importing measure values from '${fileEntry.file}' with dim-s: '${fileEntry.geo},${fileEntry.time}'`);
//           //
//           async.parallel({
//             _addDimensionsToMeasure: cb => addDimensionsToMeasure(measure._id, [fileEntry.geo, fileEntry.time], cb),
//             // build dimension values hash
//             dimensionValues: cb => buildDimensionValuesHash([fileEntry.geo, fileEntry.time], cb),
//             // and load measure values from csv
//             measureValues: cb => readCsvFile(fileEntry.file)({}, cb)
//           }, (err, res) => {
//             const newPipe = Object.assign({}, pipe, res);
//             if (err) {
//               return cb(err);
//             }
//             return async.waterfall([
//               cb => cb(null, newPipe),
//               // find out all missing dimension values
//               (pipe, cb) => {
//                 // 2 dimensional only for now
//                 pipe.missingValues = _.chain(pipe.measureValues)
//                   .map(entry => {
//                     entry.geo = geoMapping[entry.geo] || entry.geo;
//                     return entry;
//                   })
//                   .reduce((res, val) => {
//                     if (!pipe.dimensionValues[fileEntry.geo] || !pipe.dimensionValues[fileEntry.geo][val.geo]) {
//                       res[fileEntry.geo][val.geo] = true;
//                     }
//                     if (!pipe.dimensionValues[fileEntry.time] || !pipe.dimensionValues[fileEntry.time][val.time]) {
//                       res[fileEntry.time][val.time] = true;
//                     }
//                     return res;
//                   }, {[fileEntry.geo]: {}, [fileEntry.time]: {}})
//                   .reduce((res, val, key) => {
//                     const keys = Object.keys(val);
//                     if (!keys.length) {
//                       return res;
//                     }
//                     res[key] = keys;
//                     logger.info(`Need to add missing '${key}' dimension values: '${keys.join(',')}'`);
//                     return res;
//                   }, {})
//                   .value();
//                 pipe.missingValues = Object.keys(pipe.missingValues) ? pipe.missingValues : null;
//                 return cb(null, pipe);
//               },
//               // create missing dimension values
//               (pipe, pipeCb) => {
//                 if (!pipe.missingValues) {
//                   return pipeCb(null, pipe);
//                 }
//                 // for each dimension
//                 async.forEachOfSeries(pipe.missingValues, (val, key, cb) => {
//                   // find dimension from DB
//                   Dimensions.findOne({gid: key}, {gid: 1}).lean().exec((err, dim) => {
//                     if (err) {
//                       return cb(err);
//                     }
//
//                     // if dimension is not in DB it means its missing in ddf-dimensions csv
//                     if (!dim) {
//                       return cb(new Error(`Dimension '${key}' not found!`));
//                     }
//
//                     // map dimension values to DB schema
//                     const dimValsToAdd = _.map(val, v=> {
//                       return {
//                         dimensionGid: dim.gid,
//                         dimension: dim._id,
//                         value: v,
//                         title: v
//                       };
//                     });
//                     // create dimension values in DB
//                     async.eachLimit(dimValsToAdd, 10, (entity, cb) => {
//                       let query = {value: entity.value};
//                       return insertWhenEntityDoesNotExist(DimensionValues, query, entity, err=>cb(err));
//                     }, cb);
//                   });
//                 }, err => {
//                   if (err) {
//                     return pipeCb(err);
//                   }
//                   // rebuild dimension values hash
//                   buildDimensionValuesHash([fileEntry.geo, fileEntry.time], (err, dimValues) => {
//                     pipe.dimensionValues = dimValues;
//                     return pipeCb(err, pipe);
//                   });
//                 });
//               },
//               // create measure values
//               (pipe, cmcb) => {
//                 // and again we have 2 dims hardcode
//                 const hardcodedDims = ['geo', 'time'];
//                 const dimensions = _.map(hardcodedDims, v=>fileEntry[v]);
//
//                 return async.waterfall([
//                   cb=>cb(null, pipe),
//                   // find dimensions in db
//                   (pipe, cb) => Dimensions.find({gid: {$in: dimensions}}, {
//                     gid: 1,
//                     subdimOf: 1
//                   }).lean().exec((err, dims) => {
//                     // build dimensions hash map
//                     pipe.dimensions = _.keyBy(dims, 'gid');
//                     return cb(err, pipe);
//                   }),
//                   (pipe, cb) => {
//
//                     async.eachLimit(pipe.measureValues, 20, (measureValueEntry, cb) => {
//                       const measureValue = measureValueEntry[pipe.measure.gid];
//                       if (!measureValue && measureValue !== 0) {
//                         return setImmediate(cb);
//                       }
//                       let query = {
//                         value: measureValue,
//                         coordinates: { $all: [] }
//                       };
//                       const coordinates = _.map(pipe.dimensions, (dimension) => {
//                         const value = measureValueEntry[dimension.subdimOf] || measureValueEntry[dimension.gid];
//                         query.coordinates.$all.push({$elemMatch: {dimensionName: dimension.gid, value: value}});
//                         return {
//                           value: value,
//                           dimensionName: dimension.gid,
//
//                           dimension: dimension._id,
//                           dimensionValue: pipe.dimensionValues[dimension.gid][value]
//                         };
//                       });
//                       const dbMeasureValue = {
//                         coordinates: coordinates,
//                         value: measureValue,
//
//                         indicator: pipe.measure._id,
//                         indicatorName: pipe.measure.gid
//                       };
//
//                       return insertWhenEntityDoesNotExist(IndicatorsValues, query, dbMeasureValue, err => cb(err));
//                     }, cb);
//                   }
//                 ], cmcb);
//               }
//               // end of waterfall
//             ], err => cb(err, pipe));
//             // end of parallel
//           });
//           // end of eachSeries2
//         }, err => escb(err, pipe));
//         // end of eachSeries1
//       }, err=>pcb(err, mPipe));
//     }
//     // end return pipeWaterfall([
//   ]);
// }

// measure values helper
function buildDimensionValuesHash(dimensions, bcb) {
  async.waterfall([
    cb => DimensionValues.find({dimensionGid: {$in: dimensions}}, {dimensionGid: 1, value: 1})
      .lean().exec(cb),
    (dimensionValues, cb) => {
      const dimsHash = _.reduce(dimensions, (mem, v)=> {
        mem[v] = {};
        return mem;
      }, {});
      return cb(null, _.reduce(dimensionValues, (res, dv) => {
        res[dv.dimensionGid][dv.value] = dv;
        return res;
      }, dimsHash));
    }
  ], bcb);
}

// add dimensions to measure entries
function addDimensionsToMeasure(id, dimensionsArr, adcb) {
  return async.waterfall([
    cb => Dimensions.find({gid: {$in: dimensionsArr}}, {_id: 1}).lean().exec(cb),
    (dimensions, cb) => cb(null, _.map(dimensions, '_id')),
    (dimensions, cb) => Indicators.update({_id: id}, {$addToSet: {dimensions: {$each: dimensions}}}, cb)
  ], adcb);
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
      indicatorUrl: _entry.indicator_url,

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

function mapDdfEntityToWsModel(pipe) {
  return (entry) => {
    let gid = passGeoMapping(pipe, entry);
    let resolvedColumns = mapResolvedColumns(entry);
    let resolvedGroups = mapResolvedGroups(pipe, resolvedColumns);

    return {
      gid: gid,
      title: entry.name,
      source: ddfEntitiesFileTemplate(pipe.eg),
      properties: entry,

      domain: pipe.eg.domain ? pipe.eg.domain._id : pipe.eg._id,
      groups: resolvedGroups,
      childOf: [],

      versions: [pipe.version._id]
    };
  };
}

function mapResolvedGroups(pipe, resolveGids) {
  return _.chain(pipe.concepts)
    .filter(concept => defaultEntityGroupTypes.indexOf(concept.type) > -1 && resolveGids.indexOf(concept.gid) > -1)
    .map(concept => concept._id)
    .union([pipe.eg.domain ? pipe.eg.domain._id : pipe.eg._id])
    .uniq()
    .value();
}

function mapResolvedColumns(entry) {
  return _.chain(entry)
    .keys()
    .map(setName => _.trimStart(setName, 'is--'))
    .uniq()
    .value();
}

function mapDdfDataPointToWsModel(pipe) {
  return function (entry, key) {
    // validateDataPoint(entry);
    // console.log(_.values(entry));
    let isValidEntry = _.values(entry)
      .every(value => !_.isNil(value));


    if (!isValidEntry) {
      console.error(`[${key}] Validation error: There is empty value(s) in file '${pipe.fileName}'`);
      return [];
    }

    let dimensions = _.chain(entry)
      .keys()
      .filter(conceptGid => _.keys(pipe.dimensions).indexOf(conceptGid) > -1)
      .reduce((result, conceptGid) => {
        let entity = _.find(pipe.entities, (_entity) => {
          return _entity.gid == entry[conceptGid];
        });

        if (!entity) {
          console.error(`There is no entity with gid '${entry[conceptGid]}' from file '${pipe.fileName}'`);
        }

        if (entity) {
          result.push({
            gid: entry[conceptGid],
            conceptGid: conceptGid,
            concept: pipe.dimensions[conceptGid]._id,
            entity: entity._id
          });
        }

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
      console.error(`[${rowNumber}, ${columnName}] Validation error: The cell value isn't valid JSON, fix it please!\nError message : ${e}\nGiven value: ${value}`);
      return null;
    }

    return _value;
  });

  return _entry;
}

//*** Utils ***
function reduceUniqueNestedValues(data, propertyName) {
  return _.chain(data)
    .reduce((result, item) => result.concat(_.get(item, propertyName)), [])
    .uniq()
    .compact()
    .value();
}

function passGeoMapping(pipe, entry) {
  let _value = entry[pipe.eg.gid] || (pipe.eg.domain && entry[pipe.eg.domain.gid]);

  if (!_value) {
    console.error(`Either '${pipe.eg.gid}' or '${pipe.eg.domain.gid}' columns weren't found in file '${ddfEntitiesFileTemplate(pipe.eg)}'`);
  }

  let gid = process.env.USE_GEO_MAPPING === 'true' ? geoMapping[_value] || _value : _value;

  return gid;
}

function flatEntityRelations(entities) {
  return _.chain(entities)
    .flatMap(_getFlattenRelations)
    .filter(relation => relation.parentEntityGid !== undefined)
    .value();

  function _getFlattenRelations(entity) {
    let groups = _.map(entity.groups, group => group.gid);

    return _.map(groups, (entityGroupGid) => {
      return {
        entityGroupGid: entityGroupGid,
        childEntityGid: entity.gid,
        parentEntityGid: entity.properties[entityGroupGid]
      }
    });
  }
}

function readCsvFile(file, options, cb) {
  const converter = new Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(resolvePath(file), (err, data) => {
    if (err) {
      console.error(err);
    }

    return cb(null, data);
  });
}

function pipeWaterfall(tasks) {
  return (pipe, cbw) => {
    async.waterfall(
      [async.constant(pipe)].concat(tasks),
      err => cbw(err, {}));
  };
}

function insertWhenEntityDoesNotExist(model, query, entity, cb) {
  return model.findOne(query, (err, document) => {
    if (err) {
      return cb(err);
    }

    if (document) {
      return cb();
    }

    return model.create(entity, cb);
  });
}
