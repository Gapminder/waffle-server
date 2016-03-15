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

// const geoMappingHash = require('./geo-mapping.json');
const Geo = mongoose.model('Geo');
const Dimensions = mongoose.model('Dimensions');
const DimensionValues = mongoose.model('DimensionValues');
const Indicators = mongoose.model('Indicators');
const IndicatorsValues = mongoose.model('IndicatorValues');
const Translations = mongoose.model('Translations');
const IndexTree = mongoose.model('IndexTree');
const IndexDb = mongoose.model('IndexDb');

// geo mapping
const geoMapping = require('./geo-mapping.json');

// entityDomains
const entityTypes = {
  entity_set: 'entity_set',
  entity_domain: 'entity_domain',
  time: 'time'
};
// measure types
const measureTypes = {
  measure: 'measure'
};

// take from args
let logger;
let config;
let pathToDdfFolder;
let resolvePath;
let ddfConceptsFile;
let ddfIndexFile;
let ddfEntityDomainsValuesLatLng = [
  {gid: 'country', subdimOf: 'geo'},
  {gid: 'global', subdimOf: 'geo'},
  {gid: 'geographic_regions_in_4_colors', subdimOf: 'geo'}
];

module.exports = function (app, done) {
  logger = app.get('log');
  config = app.get('config');

  pathToDdfFolder = config.PATH_TO_DDF_FOLDER;
  resolvePath = (filename) => path.resolve('..', pathToDdfFolder, filename);
  ddfConceptsFile = 'ddf--concepts.csv';
  ddfIndexFile = 'ddf--index.csv';

  async.waterfall([
    cb => Geo.remove({}, err => cb(err)),
    cb => Dimensions.remove({}, err => cb(err)),
    cb => DimensionValues.remove({}, err => cb(err)),
    cb => Indicators.remove({}, err => cb(err)),
    cb => IndicatorsValues.remove({}, err => cb(err)),
    cb => Translations.remove({}, err => cb(err)),
    cb => IndexDb.remove({}, err => cb(err)),

    importIndicatorsDb,
    importIndicatorsTree,
    createTranslations,

    cb => cb(null, {}),
    createEntityDomainsAndSets(ddfConceptsFile),
    // and geo
    createEntityDomainsValues(v=>v.subdimOf ? `ddf--entities--${v.subdimOf}--${v.gid}.csv` : `ddf--list--${v.gid}.csv`),
    updateEntityDomainsValuesLatLng(v=> `ddf--list--${v.gid}.csv`),
    createMeasures(ddfConceptsFile),
    createDataPoints(ddfIndexFile)
  ], (err) => {
    console.timeEnd('done');
    console.log(err);
    return done(err);
  });
};

function importIndicatorsDb(cb) {
  logger.info('Importing indicator db');
  const indicatorsDB = _.keys(metadata.indicatorsDB)
    .map(function (key) {
      return _.extend(metadata.indicatorsDB[key], {name: key});
    });

  IndexDb.collection.insert(indicatorsDB, function (err, docs) {
    if (err) {
      return cb(err);
    }

    return cb();
  });
}

function importIndicatorsTree(cb) {
  logger.info('importing indicators tree');
  IndexTree
    .findOne({}, {_id: 0, __v: 0})
    .exec(function (err, tree) {
      if (err) {
        return cb(err);
      }

      if (!tree) {
        const indexTree = new IndexTree(metadata.indicatorsTree);
        return indexTree.save(function (_err) {
          return cb(_err);
        });
      }

      IndexTree.update({}, {$set: metadata.indicatorsTree}, function (_err) {
        return cb(_err);
      });
    });
}

function createEntityDomainsAndSets(ddf_dimensions_file) {
  logger.info('create dimensions');
  return pipeWaterfall([
    readCsvFile(ddf_dimensions_file),
    pipeMapSync(mapDdfConceptsToWsModel),
    (concepts, cb) => cb(null, concepts.filter(concept => concept.type && concept.type in entityTypes)),
    pipeEachLimit((v, cb)=>Dimensions.create(v, (err)=>cb(err, v)))
  ]);
}

function createEntityDomainsValues(ddf_dimension_values_pattern) {
  logger.info('create dimension values');
  return pipeWaterfall([
    (pipe, cb) => Dimensions.find({}, {gid: 1, subdimOf: 1}).lean().exec(cb),
    pipeMapSync(dim=>Object.assign(dim, {file: ddf_dimension_values_pattern(dim)})),
    pipeEachLimit((dim, cb)=>readCsvFile(dim.file)({}, function (err, jsonArr) {
      if (err) {
        console.warn(`dimensions file not found: ${err.message}`);
        return cb();
      }
      async.eachLimit(jsonArr, 10, (row, ecb) => {
        DimensionValues.create(mapDdfEntityValuesToWsModel(dim, row), (errD)=> {
          if (errD) {
            return ecb(errD);
          }
          // create geo values
          if (dim.gid === 'geo' || dim.subdimOf === 'geo') {
            // return Geo.create(mapDdfDimensionsToGeoWsModel(dim, row), (errG) => ecb(errG));
          }

          return ecb();
        });
      }, cb);
    }))
  ]);
}

// hardcode for consistency between ddf v0.2 and ddf v1
function updateEntityDomainsValuesLatLng(ddf_dimension_values_pattern) {
  logger.info('update dimension values (lat/lng)');
  return pipeWaterfall([
    (pipe, cb) => cb(null, ddfEntityDomainsValuesLatLng),
    pipeMapSync(dim=>Object.assign(dim, {file: ddf_dimension_values_pattern(dim)})),
    pipeEachLimit((dim, cb)=>readCsvFile(dim.file)({}, function (err, jsonArr) {
      if (err) {
        console.warn(`dimensions file not found: ${err.message}`);
        return cb();
      }
      async.eachLimit(jsonArr, 10, (row, ecb) => {
        DimensionValues.findOne({value: row.geo}, (errD, dv)=> {
          if (errD) {
            return ecb(errD);
          }
          // create geo values
          if (dim.gid === 'geo' || dim.subdimOf === 'geo') {
            // return Geo.create(mapDdfDimensionsToGeoWsModel(dim, row), (errG) => ecb(errG));
          }
          let model = dv;
          if (!model) {
            model = new DimensionValues(mapDdfEntityValuesToWsModel(dim, row));
            return model.save(ecb);
          }
          model.markModified('properties');
          model.properties.latitude = row.latitude || null;
          model.properties.longitude = row.longitude || null;
          model.properties.color = row.color || null;
          return model.save(ecb);
        });
      }, cb);
    }))
  ]);
}

function createMeasures(ddfConceptsFile) {
  logger.info('create measures');
  return pipeWaterfall([
    readCsvFile(ddfConceptsFile),
    pipeMapSync(mapDdfMeasureToWsModel),
    (concepts, cb) => cb(null, concepts.filter(concept => concept.type && concept.type in measureTypes)),
    pipeEachLimit((v, cb)=>Indicators.create(v, (err) => cb(err, v)))
  ]);
}

function createTranslations(cb) {
  logger.info('create translations');
  const en = require('./vizabi/en');
  const se = require('./vizabi/se');
  const translations = []
    .concat(map(en, 'en'))
    .concat(map(se, 'se'));
  return Translations.create(translations, err => cb(err));

  function map(json, lang) {
    return _.reduce(json, function (res, value, key) {
      res.push({key: key, value: value, language: lang});
      return res;
    }, []);
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
function createDataPoints(ddf_index_file) {
  logger.info('Start: create indicator values');
  return pipeWaterfall([
    // load all measures and dimensions from DB
    (pipe, pcb) => async.parallel({
      measures: cb=> Indicators.find({}, {gid: 1}).lean().exec(cb),
      dimensions: cb=> Dimensions.find({}, {gid: 1}).lean().exec(cb),
      // filesIndex: cb=> readCsvFile(ddf_index_file)({}, cb),
      fileList: cb => {
        fs.readdir(path.resolve('..', pathToDdfFolder), (err, fileNames) => {
          if (err) {
            return cb(err);
          }
          const START_INDEX = 2;
          const dataPoints = fileNames
            .filter(fileName => /^ddf--datapoints--/.test(fileName))
            .map(fileName => {
              const spl = fileName.split(/--|\.{1}/);
              const allConcepts = spl.slice(START_INDEX);
              const posForBy = allConcepts.indexOf('by');
              const details = {
                file: fileName,
                measure: allConcepts.slice(0, posForBy)[0],
                concepts: allConcepts.slice(posForBy + 1, allConcepts.length - 1),
                geo: 'country',
                time: 'year'
              };
              return details;
            });
          return cb(null, dataPoints);
        });
      }
    }, pcb),
    // group file entries from ddf-index my measure id
    (pipe, cb) => {
      // pipe.filesIndex = _.groupBy(pipe.filesIndex, v=>v.value_concept);
      // todo: use this only for debugging to import single measure file
      if (process.env.DEBUG_IMPORT) {
        pipe.fileList.length = 1;
      }
      pipe.filesIndex = _.groupBy(pipe.fileList, v=>v.measure);
      return cb(null, pipe);
    },
    // do all other? WTF? REALLY?
    (mPipe, pcb) => {
      // for each measure entry from DB
      async.eachSeries(mPipe.measures, (measure, escb) => {
        const pipe = Object.assign({}, mPipe, {measure});
        // check entry in ddf-index.csv
        if (!pipe.filesIndex[measure.gid]) {
          // produce warning and exit
          console.warn(`File for measure ${measure.gid} not found`/* in ${ddf_index_file}`*/);
          return escb();
        }

        // for each measure entries from ddf-index.csv
        async.eachSeries(pipe.filesIndex[measure.gid], (fileEntry, cb)=> {
          if (!fileEntry.geo || !fileEntry.time) {
            logger.info(`Skipping ${fileEntry.file} - already imported`);
            return cb();
          }
          logger.info(`Importing measure values from '${fileEntry.file}' with dim-s: '${fileEntry.geo},${fileEntry.time}'`);
          //
          async.parallel({
            _addDimensionsToMeasure: cb => addDimensionsToMeasure(measure._id, [fileEntry.geo, fileEntry.time], cb),
            // build dimension values hash
            dimensionValues: cb => buildDimensionValuesHash([fileEntry.geo, fileEntry.time], cb),
            // and load measure values from csv
            measureValues: cb => readCsvFile(fileEntry.file)({}, cb)
          }, (err, res) => {
            const newPipe = Object.assign({}, pipe, res);
            if (err) {
              return cb(err);
            }
            return async.waterfall([
              cb => cb(null, newPipe),
              // find out all missing dimension values
              (pipe, cb) => {
                // 2 dimensional only for now
                pipe.missingValues = _.chain(pipe.measureValues)
                  .map(entry => {
                    entry.geo = geoMapping[entry.geo] || entry.geo;
                    return entry;
                  })
                  .reduce((res, val) => {
                    if (!pipe.dimensionValues[fileEntry.geo] || !pipe.dimensionValues[fileEntry.geo][val.geo]) {
                      res[fileEntry.geo][val.geo] = true;
                    }
                    if (!pipe.dimensionValues[fileEntry.time] || !pipe.dimensionValues[fileEntry.time][val.time]) {
                      res[fileEntry.time][val.time] = true;
                    }
                    return res;
                  }, {[fileEntry.geo]: {}, [fileEntry.time]: {}})
                  .reduce((res, val, key) => {
                    const keys = Object.keys(val);
                    if (!keys.length) {
                      return res;
                    }
                    res[key] = keys;
                    logger.info(`Need to add missing '${key}' dimension values: '${keys.join(',')}'`);
                    return res;
                  }, {})
                  .value();
                pipe.missingValues = Object.keys(pipe.missingValues) ? pipe.missingValues : null;
                return cb(null, pipe);
              },
              // create missing dimension values
              (pipe, pipeCb) => {
                if (!pipe.missingValues) {
                  return pipeCb(null, pipe);
                }
                // for each dimension
                async.forEachOfSeries(pipe.missingValues, (val, key, cb) => {
                  // find dimension from DB
                  Dimensions.findOne({gid: key}, {gid: 1}).lean().exec((err, dim) => {
                    if (err) {
                      return cb(err);
                    }

                    // if dimension is not in DB it means its missing in ddf-dimensions csv
                    if (!dim) {
                      return cb(new Error(`Dimension '${key}' not found!`));
                    }

                    // map dimension values to DB schema
                    const dimValsToAdd = _.map(val, v=> {
                      return {
                        dimensionGid: dim.gid,
                        dimension: dim._id,
                        value: v,
                        title: v
                      };
                    });
                    // create dimension values in DB
                    async.eachLimit(dimValsToAdd, 10, (v, cb) => DimensionValues.create(v, err=>cb(err)), cb);
                  });
                }, err => {
                  if (err) {
                    return pipeCb(err);
                  }
                  // rebuild dimension values hash
                  buildDimensionValuesHash([fileEntry.geo, fileEntry.time], (err, dimValues) => {
                    pipe.dimensionValues = dimValues;
                    return pipeCb(err, pipe);
                  });
                });
              },
              // create measure values
              (pipe, cmcb) => {
                // and again we have 2 dims hardcode
                const hardcodedDims = ['geo', 'time'];
                const dimensions = _.map(hardcodedDims, v=>fileEntry[v]);

                return async.waterfall([
                  cb=>cb(null, pipe),
                  // find dimensions in db
                  (pipe, cb) => Dimensions.find({gid: {$in: dimensions}}, {
                    gid: 1,
                    subdimOf: 1
                  }).lean().exec((err, dims) => {
                    // build dimensions hash map
                    pipe.dimensions = _.keyBy(dims, 'gid');
                    return cb(err, pipe);
                  }),
                  (pipe, cb) => {

                    async.eachLimit(pipe.measureValues, 20, (measureValueEntry, cb) => {
                      const measureValue = measureValueEntry[pipe.measure.gid];
                      if (!measureValue && measureValue !== 0) {
                        return setImmediate(cb);
                      }
                      const coordinates = _.map(pipe.dimensions, (dimension) => {
                        const value = measureValueEntry[dimension.subdimOf] || measureValueEntry[dimension.gid];
                        return {
                          value: value,
                          dimensionName: dimension.gid,

                          dimension: dimension._id,
                          dimensionValue: pipe.dimensionValues[dimension.gid][value]
                        };
                      });
                      const dbMeasureValue = {
                        coordinates: coordinates,
                        value: measureValue,

                        indicator: pipe.measure._id,
                        indicatorName: pipe.measure.gid
                      };
                      return IndicatorsValues.create(dbMeasureValue, err => cb(err));
                    }, cb);
                  }
                ], cmcb);
              }
              // end of waterfall
            ], err => cb(err, pipe));
            // end of parallel
          });
          // end of eachSeries2
        }, err => escb(err, pipe));
        // end of eachSeries1
      }, err=>pcb(err, mPipe));
    }
    // end return pipeWaterfall([
  ]);
}

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

// mappers
function mapDdfConceptsToWsModel(entry) {
  // let drillups = _.chain(entry.drill_up).trim('[').trim(']').words(/[^\'\, \']+/g).value();

  return {
    gid: entry.concept,
    name: entry.name,
    type: entry.concept_type,
    tooltip: entry.tooltip || null,
    link: entry.indicator_url || null,
    drillups: entry.drill_up || null,
    subdimOf: entry.domain || null
  };
}

function mapDdfEntityValuesToWsModel(dim, entry) {
  let key;
  if (entry[dim.gid]) {
    key = dim.gid;
  } else if (entry[dim.subdimOf]) {
    key = dim.subdimOf;
  }
  let value = entry[key] && geoMapping[entry[key]] || geoMapping[entry.geo] || entry[key];
  entry.latitude = entry.latitude || null;
  entry.longitude = entry.latitude || null;
  entry.color = entry.latitude || null;
  return {
    parentGid: entry.world_4region || entry.geographic_regions_in_4_colors || 'world',
    dimensionGid: dim.gid,
    dimension: dim._id,
    value: value,
    title: entry.name,
    properties: entry
  };
}

function mapDdfDimensionsToGeoWsModel(dim, entry) {
  let key;
  if (entry[dim.gid]) {
    key = dim.gid;
  } else if (entry[dim.subdimOf]) {
    key = dim.subdimOf;
  }
  let value = entry[key] && geoMapping[entry[key]] || geoMapping[entry.geo] || entry[key];

  return {
    parentGid: entry.world_4region || entry.geographic_regions_in_4_colors || 'world',
    dimensionGid: dim.gid,
    dimension: dim._id,
    value: value,
    title: entry.name,
    properties: entry
  };
  /*return {
    gid: entry.geo,
    name: entry.name,

    nameShort: entry.name_short,
    nameLong: entry.name_long,

    description: entry.description,

    latitude: entry.latitude,
    longitude: entry.longitude,
    region4: entry.world_4region,
    color: entry.color,

    isGlobal: entry['is.global'],
    isRegion4: entry['is.world_4region'],
    isCountry: entry['is.country'],
    isUnState: entry['is.un_state']
  };*/
}

function mapDdfMeasureToWsModel(entry) {
  if (entry.scales === 'lin') {
    entry.scales = 'linear';
  }
  const defaultScale = ['linear', 'log'];

  const tags = [];/*_((entry.tag || '').split(','))
    .map(_.trim)
    .compact()
    .values();
*/
  return {
    gid: entry.concept,
    name: entry.name,
    type: entry.concept_type,
    tooltip: entry.tooltip || null,
    link: entry.indicator_url || null,
    properties: entry,
    // title: entry.title,

    // nameShort: entry.name_short,
    // nameLong: entry.name_long,

    // description: entry.description,
    // definitionSnippet: entry.definition_snippet,

    // lowLabelShort: entry.low_label_short,
    // lowLabel: entry.low_label,
    //
    // highLabelShort: entry.high_label_short,
    // highLabel: entry.high_label,
    //
    // goodDirection: entry.good_direction,
    //
    // link: entry.link,
    //
    // usability: entry.usability,
    //
    // unit: entry.unit,
    // valueInterval: entry.value_interval,
    // scales: entry.scales ? [entry.scales] : defaultScale,
    // precisionMaximum: entry.precision_maximum,
    // decimalsMaximum: entry.decimals_maximum,
    //
    // tags: tags,
    //
    meta: {
      allowCharts: ['*'],
      use: 'indicator'
    }
  };
}

// utils
function readCsvFile(file, options) {
  return (pipe, cb) => {
    if (!cb) {
      cb = pipe;
      pipe = {};
    }
    const converter = new Converter(Object.assign({}, {
      workerNum: 4,
      flatKeys: true
    }, options));

    converter.fromFile(resolvePath(file), cb);
  };
}

function pipeWaterfall(tasks) {
  return (pipe, cbw) => {
    const _cb = cbw || pipe;
    async.waterfall([cb=>cb(null, cbw ? pipe : {})].concat(tasks), err => _cb(err, {}));
  };
}

function pipeEachLimit(fn, limit) {
  return (pipe, cb) => async.eachLimit(pipe, limit || 10, fn, err=>cb(err, pipe));
}

function pipeMapSync(fn) {
  return (pipe, cb) => {
    return cb(null, _.map(pipe, fn));
  }
}
