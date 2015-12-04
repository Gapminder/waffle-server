// Converter Class
var _ = require('lodash');
var fs = require('fs');
var async = require('async');
var Converter = require('csvtojson').Converter;

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ws_test');
mongoose.set('debug', true);
require('../ws.repository/geo.model');
require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/translations.model');
var Geo = mongoose.model('Geo');
var Dimensions = mongoose.model('Dimensions');
var Translations = mongoose.model('Translations');

var tasks = [
  // geo
  ['./data/2015_11_26/_e_geo__global.csv', ['gid', 'name', 'subdim']],
  ['./data/2015_11_26/_e_geo__g_region4.csv', ['gid', 'isRegion', 'name', 'nameShort', 'description', 'subdim', 'lat', 'lng', 'color']],
  ['./data/2015_11_26/_e_geo__g_west_rest.csv', ['gid', 'name', 'subdim']],
  // geo,geo.name,geo.is.territory,geo.is.un_state,geo.g_region4,geo.g_west_rest,geo.lat,geo.lng
  ['./data/2015_11_26/_e_geo__territory.csv', ['gid', 'name', 'isTerritory', 'isUnState', 'geoRegion4', 'geoWestRest', 'lat', 'lng']],
];

async.waterfall([
  cleanGeo,
  importGeo,
  cleanDimensions,
  createDimensions,
  createTranslations
], function (err) {
  if (err) {
    console.error(err);
  }
});

// geo region
function cleanGeo(cb) {
  return Geo.remove({}, cb);
}

function importGeo(cb) {
  async.eachLimit(tasks, 1, function (task, cb) {
    parseGeoFile(task[0], task[1], function (err, dataArray) {
      async.eachLimit(dataArray, 50, function (geoJson, cb) {
        return Geo.create(geoJson, cb);
      }, function () {
        cb();
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

function parseGeoFile(file, headers, cb) {
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
    })
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
  return Dimensions.remove({}, cb);
}

function createDimensions(cb) {
  return Dimensions.create([
    {name: 'year', title: 'Year'},
    {name: 'geo', title: 'Geography'}], cb);
}

function createTranslations(cb) {
  var en = require('./vizabi/en');
  var se = require('./vizabi/se');
  var translations = []
    .concat(map(en, 'en'))
    .concat(map(se, 'se'));
  return Translations.remove({}, function (){
    return Translations.create(translations, cb);
  });

  function map(json, lang) {
    return _.reduce(json, function (res, value, key) {
      res.push({key: key, value: value, language: lang});
      return res;
    }, []);
  }
}
