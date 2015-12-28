'use strict';
// Converter Class
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Converter = require('csvtojson').Converter;

var mongoose = require('mongoose');
//mongoose.set('debug', true);
mongoose.connect('mongodb://localhost:27017/ws_test');

var metadata = require('./vizabi/metadata.json');
var Geo = require('../ws.repository/geo.model');
var Dimensions = require('../ws.repository/dimensions/dimensions.model');
var DimensionValues = require('../ws.repository/dimension-values/dimension-values.model');
var Translations = require('../ws.repository/translations.model');
var Indicators = require('../ws.repository/indicators/indicators.model');
var IndicatorsValues = require('../ws.repository/indicator-values/indicator-values.model');
var IndexTree = require('../ws.repository/indexTree.model');
var IndexDb = require('../ws.repository/indexDb.model');

// var geoMappingHash = require('./geo-mapping.json');

// take from args
const pathToDdfFolder = '../../open-numbers/ddf--gapminder--systema_globalis';
const resolvePath = (filename) => path.resolve(pathToDdfFolder, filename);
const ddfDimensionsFile = 'ddf--dimensions.csv';
const ddfMeasuresFile = 'ddf--measures.csv';
const ddfIndexFile = 'ddf--index.csv';

async.waterfall([
  cb => Geo.remove({}, err => cb(err)),
  cb => Dimensions.remove({}, err => cb(err)),
  cb => DimensionValues.remove({}, err => cb(err)),
  cb => Indicators.remove({}, err => cb(err)),
  cb => IndicatorsValues.remove({}, err => cb(err)),
  cb => Translations.remove({}, err => cb(err)),

  importIndicatorsDb,
  importIndicatorsTree,
  createTranslations,

  cb => cb(null, {}),
  createDimensions(ddfDimensionsFile),
  // and geo
  createDimensionValues(v=>v.subdimOf ? `ddf--list--${v.subdimOf}--${v.gid}.csv` : `ddf--list--${v.gid}.csv`),
  createMeasures(ddfMeasuresFile),
  createMeasureValues(ddfIndexFile)
], function (err) {
  if (err) {
    console.error(err);
  }

  console.log('done');
  process.exit(0);
});

function importIndicatorsDb(cb) {
  var indicatorsDB = _.keys(metadata.indicatorsDB)
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
  IndexTree
    .findOne({}, {_id: 0, __v: 0})
    .exec(function (err, tree) {
      if (err) {
        return cb(err);
      }

      if (!tree) {
        var indexTree = new IndexTree(metadata.indicatorsTree);
        return indexTree.save(function (_err) {
          return cb(_err);
        });
      }

      IndexTree.update({}, {$set: metadata.indicatorsTree}, function (_err) {
        return cb(_err);
      });
    });
}

function createDimensions(ddf_dimensions_file) {
  return pipeWaterfall([
    readCsvFile(ddf_dimensions_file),
    pipeMapSync(mapDdfDimensionsToWsModel),
    pipeEachLimit((v, cb)=>Dimensions.create(v, (err)=>cb(err, v)))
  ]);
}

function createDimensionValues(ddf_dimension_values_pattern) {
  return pipeWaterfall([
    (pipe, cb) => Dimensions.find({}, {gid: 1, subdimOf: 1}).lean().exec(cb),
    pipeMapSync(dim=>Object.assign(dim, {file: ddf_dimension_values_pattern(dim)})),
    pipeEachLimit((dim, cb)=>readCsvFile(dim.file)({}, function (err, jsonArr) {
      if (err) {
        console.warn(`dimensions file not found: ${err.message}`);
        return cb();
      }
      async.eachLimit(jsonArr, 10, (row, ecb) => {
        DimensionValues.create(mapDdfDimensionValuesToWsModel(dim, row), (errD)=> {
          if (errD) {
            return ecb(errD);
          }
          // create geo values
          if (dim.gid === 'geo' || dim.subdimOf === 'geo') {
            return Geo.create(mapDdfDimensionsToGeoWsModel(row), (errG) => ecb(errG));
          }

          return ecb();
        });
      }, cb);
    }))
  ]);
}

function createMeasures(ddf_measures_file) {
  return pipeWaterfall([
    readCsvFile(ddf_measures_file),
    pipeMapSync(mapDdfMeasureToWsModel),
    pipeEachLimit((v, cb)=>Indicators.create(v, (err)=>cb(err, v)))
  ]);
}

function createTranslations(cb) {
  var en = require('./vizabi/en');
  var se = require('./vizabi/se');
  var translations = []
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
function createMeasureValues(ddf_index_file) {
  console.log('Start: create indicator values');
  return pipeWaterfall([
    // load all measures and dimensions from DB
    (pipe, pcb) => async.parallel({
      measures: cb=>Indicators.find({}, {gid: 1}).lean().exec(cb),
      dimensions: cb=> Dimensions.find({}, {gid: 1}).lean().exec(cb),
      filesIndex: cb=>readCsvFile(ddf_index_file)({}, cb)
    }, pcb),
    // group file entries from ddf-index my measure id
    (pipe, cb) => {
      pipe.filesIndex = _.groupBy(pipe.filesIndex, v=>v.measure);
      return cb(null, pipe);
    },
    // do all other? WTF? REALLY?
    (mPipe, pcb) => {
      // for each measure entry from DB
      async.eachSeries(mPipe.measures, (measure, escb) => {
        var pipe = Object.assign({}, mPipe, {measure});
        // check entry in ddf-index.csv
        if (!pipe.filesIndex[measure.gid]) {
          // produce warning and exit
          console.warn(`File for measure ${measure.gid} not found in ${ddf_index_file}`);
          return escb();
        }

        // for each measure entries from ddf-index.csv
        async.eachSeries(pipe.filesIndex[measure.gid], (fileEntry, cb)=> {
          console.log(`Importing measure values from '${fileEntry.file}' with dim-s: '${fileEntry.geo},${fileEntry.time}'`);
          //
          async.parallel({
            // build dimension values hash
            dimensionValues: cb => buildDimensionValuesHash([fileEntry.geo, fileEntry.time], cb),
            // and load measure values from csv
            measureValues: readCsvFile(fileEntry.file)
          }, (err, res) => {
            var newPipe = Object.assign({}, pipe, res);
            if (err) {
              return cb(err);
            }
            return async.waterfall([
              cb => cb(null, newPipe),
              // find out all missing dimension values
              (pipe, cb) => {
                // 2 dimensional only for now
                pipe.missingValues = _.chain(pipe.measureValues)
                  .reduce((res, val) => {
                    if (!pipe.dimensionValues[fileEntry.geo] || !pipe.dimensionValues[fileEntry.geo][val.geo]) {
                      res[fileEntry.geo][val.geo] = true;
                    }
                    if (!pipe.dimensionValues[fileEntry.time] || !pipe.dimensionValues[fileEntry.time][val.year]) {
                      res[fileEntry.time][val.year] = true;
                    }
                    return res;
                  }, {[fileEntry.geo]: {}, [fileEntry.time]: {}})
                  .reduce((res, val, key) => {
                    var keys = Object.keys(val);
                    if (!keys.length) {
                      return res;
                    }
                    res[key] = keys;
                    console.log(`Need to add missing '${key}' dimension values: '${keys.join(',')}'`);
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
                    var dimValsToAdd = _.map(val, v=> {
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
                var hardcodedDims = ['geo', 'time'];
                var dimensions = _.map(hardcodedDims, v=>fileEntry[v]);
                return async.waterfall([
                  cb=>cb(null, pipe),
                  // find dimensions in db
                  (pipe, cb) => Dimensions.find({gid: {$in: dimensions}}, {gid: 1, subdimOf: 1}).lean().exec((err, dims) => {
                    // build dimensions hash map
                    pipe.dimensions = _.indexBy(dims, 'gid');
                    return cb(err, pipe);
                  }),
                  (pipe, cb) => {

                    async.eachLimit(pipe.measureValues, 20, (measureValue, cb) => {
                      var coordinates = _.map(pipe.dimensions, (dimension) => {
                        var value = measureValue[dimension.subdimOf] || measureValue[dimension.gid];
                        return {
                          value: value,
                          dimensionName: dimension.gid,

                          dimension: dimension._id,
                          dimensionValue: pipe.dimensionValues[dimension.gid][value]
                        };
                      });
                      var dbMeasureValue = {
                        coordinates: coordinates,
                        value: measureValue[pipe.measure.gid],

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
      var dimsHash = _.reduce(dimensions, (mem, v)=> {
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

// mappers
function mapDdfDimensionsToWsModel(entry) {
  return {
    gid: entry.dimension,
    type: entry.type,
    subdimOf: entry.subdim_of,
    name: entry.name,
    nameShort: entry.name_short,
    nameLong: entry.name_long,
    link: entry.link,
    description: entry.description,
    usability: entry.usability,
    totalEntity: entry.total_entity,
    totalName: entry.total_name,
    defaultEntities: entry.default_entities ? entry.default_entities.split(',') : [],
    drilldowns: entry.drilldowns,
    drillups: entry.drillups,
    incompleteDrillups: entry.incomplete_drillups,
    ordinal: entry.ordinal,
    measure: entry.measure,
    interval: entry.interval,
    cardinality: entry.cardinality,
    aliases: entry.aliases ? entry.aliases.split('","').map(v=>v.replace(/"/g, '')) : []
  };
}

function mapDdfDimensionValuesToWsModel(dim, entry) {
  return {
    dimensionGid: dim.gid,
    dimension: dim._id,
    value: entry.geo,
    title: entry.name
  };
}

function mapDdfDimensionsToGeoWsModel(entry) {
  return {
    gid: entry.geo,
    name: entry.name,

    nameShort: entry.name_short,
    nameLong: entry.name_long,

    description: entry.description,

    lat: entry.lat,
    lng: entry.lng,
    region4: entry.world_4region,
    color: entry.color,

    isGlobal: entry['is.global'],
    isRegion4: entry['is.world_4region'],
    isCountry: entry['is.country'],
    isUnState: entry['is.un_state']
  };
}

function mapDdfMeasureToWsModel(entry) {
  if (entry.scales === 'lin') {
    entry.scales = 'linear';
  }
  var defaultScale = ['linear', 'log'];

  var tags = _((entry.tag || '').split(','))
    .map(_.trim)
    .compact()
    .values();

  return {
    gid: entry.measure,
    title: entry.title,

    name: entry.name,
    nameShort: entry.name_short,
    nameLong: entry.name_long,

    description: entry.description,
    definitionSnippet: entry.definition_snippet,

    lowLabelShort: entry.low_label_short,
    lowLabel: entry.low_label,

    highLabelShort: entry.high_label_short,
    highLabel: entry.high_label,

    goodDirection: entry.good_direction,

    link: entry.link,

    usability: entry.usability,

    unit: entry.unit,
    valueInterval: entry.value_interval,
    scales: entry.scales ? [entry.scales] : defaultScale,
    precisionMaximum: entry.precision_maximum,
    decimalsMaximum: entry.decimals_maximum,

    tags: tags,

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
    var converter = new Converter(Object.assign({}, {
      workerNum: 4,
      flatKeys: true
    }, options));

    converter.fromFile(resolvePath(file), cb);
  };
}

function pipeWaterfall(tasks) {
  return (pipe, cbw) => {
    var _cb = cbw || pipe;
    async.waterfall([cb=>cb(null, cbw ? pipe : {})].concat(tasks), err => _cb(err, {}));
  };
}

function pipeEachLimit(fn, limit) {
  return (pipe, cb) => async.eachLimit(pipe, limit || 10, fn, err=>cb(err, pipe));
}

function pipeMapSync(fn) {
  return (pipe, cb) => cb(null, _.map(pipe, fn));
}
