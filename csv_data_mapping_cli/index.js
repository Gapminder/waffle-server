// Converter Class
var _ = require('lodash');
var fs = require('fs');
var async = require('async');
var Converter = require('csvtojson').Converter;

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ws_test');
//mongoose.set('debug', true);
require('../ws.repository/geo.model');
require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/dimension-values/dimension-values.model');
require('../ws.repository/translations.model');
require('../ws.repository/indicators/indicators.model');
require('../ws.repository/indicator-values/indicator-values.model');

var Geo = mongoose.model('Geo');
var Dimensions = mongoose.model('Dimensions');
var DimensionValues = mongoose.model('DimensionValues');
var Translations = mongoose.model('Translations');
var Indicators = mongoose.model('Indicators');
var IndicatorsValues = mongoose.model('IndicatorValues');

var geoTasks = [
  // geo
  {
    file: './data/2015_11_26/_e_geo__global.csv',
    headers: ['gid', 'name', 'subdim']
  },
  {
    file: './data/2015_11_26/_e_geo__g_region4.csv',
    headers: ['gid', 'isRegion', 'name', 'nameShort', 'description', 'subdim', 'lat', 'lng', 'color']
  },
  {
    file: './data/2015_11_26/_e_geo__g_west_rest.csv',
    headers: ['gid', 'name', 'subdim']
  },
  // geo,geo.name,geo.is.territory,geo.is.un_state,geo.g_region4,geo.g_west_rest,geo.lat,geo.lng
  {
    file: './data/2015_11_26/_e_geo__territory.csv',
    headers: ['gid', 'name', 'isTerritory', 'isUnState', 'geoRegion4', 'geoWestRest', 'lat', 'lng']
  }
];

var measuresTask = {
  file: './data/2015_11_26/_measures.csv',
  headers: ['measure', 'name', 'prototype', 'default', 'name_short', 'name_long', 'description', 'definition', 'link', 'unit', 'tag', 'usability', 'value_type', 'value_range', 'scale', 'formula', 'variant_attributes', 'disallow_operations', 'is_aggregated', 'allow_aggregation', 'aggregation_weight', 'custom_aggregation', 'numeric_class', 'max_precision', 'max_decimals', 'variant_measures', 'variant_of']
};
var measureValuesTasks = [];

// via rest API
// 1. create dimensions
// 2. create indicators with data (gdp, gdp_pc, lex, pop, tfr, u5mr)
// 3. metadata.json - adaptor

async.waterfall([
  cleanGeo,
  importGeo,
  createTranslations,
  cleanDimensions,
  createDimensions,
  cleanIndicators,
  createIndicators
], function (err) {
  if (err) {
    console.error(err);
  }
  console.log('done');
});

// geo region
function cleanGeo(cb) {
  return Geo.remove({}, function (err) {
    return cb(err);
  });
}

function importGeo(cb) {
  console.log(arguments)
  async.eachLimit(geoTasks, 1, function (task, eachLimitCb) {
    parseCsvFile(task.file, task.headers, function (err, dataArray) {
      async.eachLimit(dataArray, 50, function (geoJson, geoEachLimit) {
        return Geo.create(geoJson, geoEachLimit);
      }, function () {
        eachLimitCb();
      });
    });
  }, function (err) {
    if (err) {
      console.error(err);
    }
    console.log('geo imported');
    return cb(err);
  });
}

function parseCsvFile(file, headers, cb) {
  var converter = new Converter({
    workerNum: 4,
    headers: headers,
    flatKeys: true
  });
  // record_parsed will be emitted each csv row being processed
  converter.on('record_parsed', function (jsonObj) {
    _.each(jsonObj, function (value, key) {
      if (value === 'TRUE') {
        jsonObj[key] = true;
      }
      if (value === 'FALSE') {
        jsonObj[key] = false;
      }
      if (key === 'isTerritory') {
        jsonObj.subdim = 'territory';
      }
    });
  });

  // end_parsed will be emitted once parsing finished
  converter.on('end_parsed', function (jsonArray) {
    return cb(null, jsonArray);
  });

// read from file
  fs.createReadStream(file).pipe(converter);
}

// dimensions region
function cleanDimensions(cb) {
  return Dimensions.remove({}, function (err) {
    if (err) {
      return cb(err);
    }

    DimensionValues.remove({}, function (err) {
      return cb(err);
    });
  });
}

function createDimensions(cb) {
  async.parallel([
    function createYears(cb) {
      Dimensions.create({name: 'year', title: 'Year'}, function (err, dimension) {
        DimensionValues.create(_
          .range(1800, 2050)
          .map(function (year) {
            return {
              dimension: dimension.id,
              value: year
            };
          }), function (err) {
          return cb(err);
        });
      });
    },
    function createCountry(cb) {
      Dimensions.create({name: 'country', title: 'Countries'}, function (err, dimension) {
        Geo.find({isTerritory: true}, {_id: 0, gid: 1, name: 1}, function (err, countries) {
          var cc = _.map(countries, function (country) {
            return {value: country.gid, title: country.name, dimension: dimension.id};
          });
          return DimensionValues.create(cc, function (err) {
            return cb(err);
          });
        });
      });
    }
  ], cb);
}

function createTranslations(cb) {
  var en = require('./vizabi/en');
  var se = require('./vizabi/se');
  var translations = []
    .concat(map(en, 'en'))
    .concat(map(se, 'se'));
  return Translations.remove({}, function () {
    return Translations.create(translations, function (err) {
      return cb(err);
    });
  });

  function map(json, lang) {
    return _.reduce(json, function (res, value, key) {
      res.push({key: key, value: value, language: lang});
      return res;
    }, []);
  }
}

function cleanIndicators(cb) {
  Indicators.remove({}, function (err) {
    if (err) {
      return cb(err);
    }
    IndicatorsValues.remove({}, function (err){
      return cb(err);
    });
  });
}

function createIndicators(cb) {
  parseCsvFile()
}
