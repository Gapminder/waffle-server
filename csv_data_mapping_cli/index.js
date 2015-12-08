// Converter Class
var _ = require('lodash');
var fs = require('fs');
var async = require('async');
var Converter = require('csvtojson').Converter;

var mongoose = require('mongoose');
//mongoose.set('debug', true);
mongoose.connect('mongodb://localhost:27017/ws_test');

var Geo = require('../ws.repository/geo.model');
var Dimensions = require('../ws.repository/dimensions/dimensions.model');
var DimensionValues = require('../ws.repository/dimension-values/dimension-values.model');
var Translations = require('../ws.repository/translations.model');
var Indicators = require('../ws.repository/indicators/indicators.model');
var IndicatorsValues = require('../ws.repository/indicator-values/indicator-values.model');

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
var measureValuesTasks = [
  {
    file: './data/2015_11_26/_measures.csv',
    headers: [],
    indicator: ''
  },
];
// via rest API
// 1. create dimensions
// 2. create indicators with data (gdp, gdp_pc, lex, pop, tfr, u5mr)
// 3. metadata.json - adaptor

async.waterfall([
  cb => Geo.remove({}, err => cb(err)),
  cb => Dimensions.remove({}, err => cb(err)),
  cb => DimensionValues.remove({}, err => cb(err)),
  cb => Indicators.remove({}, err => cb(err)),
  cb => IndicatorsValues.remove({}, err => cb(err)),
  cb => Translations.remove({}, err => cb(err)),
  importGeo,
  createTranslations,
  createDimensionsAndValues,
  createIndicators,
  //createIndicatorValues
], function (err) {
  if (err) {
    console.error(err);
  }
  console.log('done');
});

function importGeo(cb) {
  async.eachLimit(geoTasks, 1, function (task, eachLimitCb) {
    parseCsvFile(task.file, task.headers, function (err, dataArray) {
      if (err) {
        return cb(err);
      }
      async.eachLimit(dataArray, 50, function (geoJson, geoEachLimit) {
        return Geo.create(geoJson, function (err) {
          geoEachLimit(err);
        });
      }, function (err) {
        eachLimitCb(err);
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

function createDimensionsAndValues(cb) {
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
          }), err => cb(err));
      });
    },
    function createCountry(cb) {
      Dimensions.create({name: 'country', title: 'Countries'}, function (err, dimension) {
        Geo.find({isTerritory: true}, {_id: 0, gid: 1, name: 1}, function (err, countries) {
          var cc = _.map(countries, function (country) {
            return {value: country.gid, title: country.name, dimension: dimension.id};
          });
          return DimensionValues.create(cc, err => cb(err));
        });
      });
    }
  ], function (err) {
    return cb(err);
  });
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

function createIndicators(ciCb) {
  var measuresJson, dimensions;
  async.waterfall(
    [
      // parse measures csv file into json
      cb => parseCsvFile(measuresTask.file, measuresTask.headers, (err, dataArray) => {
        measuresJson = dataArray;
        return cb(err);
      }),
      // read all dimensions (year and country for now)
      cb => Dimensions.find({}).lean().exec((err, ds) => {
        dimensions = ds;
        return cb(err);
      }),
      // create indicators in db
      cb => async.eachLimit(measuresJson, 1, function (indJson, indMapCb) {
        if (indJson.scale === 'lin') {
          indJson.scale = 'linear';
        }
        var defaultScale = ['linear', 'log'];
        var range = indJson.value_range.split('x');
        (() => {
          if (!range) {
            return;
          }
          if (range[0] === '') {
            range[0] = null;
          }
          if (range[0]) {
            range[0] = +_.trim(_.trim(range[0], '='), '<');
          }
          if (range[1] === '') {
            range[1] = 999999999;
          }
          if (range[1]) {
            range[1] = +_.trim(_.trim(range[1], '<'), '=');
          }
        })();

        var tags = _(indJson.tag.split(','))
          .map(_.trim)
          .compact()
          .value();

        var indicator = {
          name: indJson.measure,
          title: indJson.name,
          meta: _.omit({
            tags: tags,
            range: range,
            scale: indJson.scale ? [indJson.scale] : defaultScale,
            allowCharts: ['*'],
            use: 'indicator',
            sourceLink: '_measures.csv',
            formula: indJson.formula,
            usability: indJson.usability,
            valueType: indJson.value_type,
            prototype: indJson.prototype,
            'default': indJson.default,
            nameShort: indJson.name_short,
            nameLong: indJson.name_long,
            description: indJson.description
          }, _.isEmpty),
          units: indJson.unit,
          dimensions: dimensions
        };

        return Indicators.create(indicator, err => indMapCb(err));
      }, err => cb(err))
    ],
    err => ciCb(err));
}

function createIndicatorValues(cb) {
  cb();
}
