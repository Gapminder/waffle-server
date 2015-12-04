// Converter Class
var _ = require('lodash');
var fs = require('fs');
var async = require('async');
var Converter = require('csvtojson').Converter;

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ws_test');
mongoose.set('debug', true);
require('../ws.repository/geo.model');
var Geo = mongoose.model('Geo');

var tasks = [
  // geo
  ['./data/2015_11_26/_e_geo__global.csv', ['gid', 'name', 'subdim']],
  ['./data/2015_11_26/_e_geo__g_region4.csv', ['gid', 'isRegion', 'name', 'nameShort', 'description', 'subdim', 'lat', 'lng', 'color']],
  ['./data/2015_11_26/_e_geo__g_west_rest.csv', ['gid', 'name', 'subdim']],
  // geo,geo.name,geo.is.territory,geo.is.un_state,geo.g_region4,geo.g_west_rest,geo.lat,geo.lng
  ['./data/2015_11_26/_e_geo__territory.csv', ['gid', 'name', 'isTerritory', 'isUnState', 'geoRegion4', 'geoWestRest', 'lat', 'lng']],
];

Geo.remove({}, function (err) {
  if (err) {
    console.log(err);
  }

  async.eachLimit(tasks, 1, function (task, cb) {
    parseGeo(task[0], task[1], function (err, dataArray) {
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
    console.log('Mission complete');
  });
});

function parseGeo(file, headers, cb) {
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
