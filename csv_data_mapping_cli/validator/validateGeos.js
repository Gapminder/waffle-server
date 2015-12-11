var Converter = require('csvtojson').Converter;
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var async = require('async');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ws_test');
var Geo = require('../../ws.repository/geo.model');

var vizabiToWsGeoProperties = {
  'geo': 'gid',
  'geo.name': 'name',
  'geo.cat': 'subdim',
  'geo.region': 'getRegion4',
  'geo.lat': 'lat',
  'geo.lng': 'lng'
};

var wsToVizabiGeoProperties = _.invert(vizabiToWsGeoProperties);

var geoValidationTasks = [
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty-geo-properties.csv'),
    headers: ['geo','geo.name','geo.cat','geo.region','geo.lat','geo.lng']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/usa-geo-properties.csv'),
    headers: ['geo','geo.name','geo.cat','geo.region']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators-geo-properties.csv'),
    headers: ['geo', 'geo.name', 'geo.cat', 'geo.region']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators.csv'),
    headers: ['geo']
  }
];

geoValidationTasks = geoValidationTasks.concat(_.range(1800, 2016).map((year) => {
  return {
    file: path.resolve(__dirname, `../data/vizabi/waffles/dont-panic-poverty-${year}.csv`),
    headers: ['geo']
  };
}));

geoValidationTasks = geoValidationTasks.concat([
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty.csv'),
    headers: ['geo']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty-withmini.csv'),
    headers: ['geo']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/swe.csv'),
    headers: ['geo']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/usa.csv'),
    headers: ['geo']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators.csv'),
    headers: ['geo']
  }
]);

async.parallelLimit(_.map(geoValidationTasks,
  (task) =>
    (cb) => {
      validateGeos(task, groupedByGidGeoResults => {
        console.log(`processed file ${task.file}`);
        cb(null, groupedByGidGeoResults)
      })
    }), 1,
  (err, results) => {
    console.log(
    _.reduce(results, (result, next) => {
      return _.merge(result, next, function(a, b) {
        if (_.isArray(a)) {
          return a.concat(b);
        }
      });
    }, {}));
    console.log('Validation is completed.')
});

function validateGeos(geoValidationTask, onValidationComplete) {
  async.waterfall(
    [
      //Parse csv with geos
      cb => parseCsvFile(geoValidationTask.file, geoValidationTask.headers, (err, csvRecords) => {
        return cb(err, csvRecords);
      }),
      //Map each record into comparison actions in order to detect diffs
      (csvRecords, cb) => {
        var comparisonActions = _.map(csvRecords, (geoJson, rowNum) => {
          return createComparisonAction(geoValidationTask.file, geoJson, rowNum);
        });
        return cb(null, comparisonActions);
      },
     //Execute comparison actions and group them by gid
      (comparisonActions, cb) => {
        async.parallelLimit(comparisonActions, 200, (err, comparedGeos) => {
          cb(err, _.groupBy(_.filter(comparedGeos, onlyExistingGeos()), (comparedGeo) => comparedGeo.gid));
        });
      }
    ],
    //Execute callback on validation complete
    (err, groupedByGidGeoResults) => {
      if (err) {
        console.error(err);
      }
      onValidationComplete(groupedByGidGeoResults);
    });
}

function createComparisonAction(csvFile, geoJson, rowNum) {
  return (cb) => {
    return Geo.findOne(prepareGeoQuery(geoJson)).lean().exec((err, geo) => {
      if (err) {
        return cb(err);
      }

      var diff = getDifference(geoJson, geo);
      if (!geo || diff) {
        return cb(null, {
          file: csvFile,
          vizabiCsvRowNum: rowNum + 2,
          gid: geo && geo.gid ? geo.gid : 'ABSENT_IN_WS: '+ geoJson[wsToVizabiGeoProperties['gid']],
          diff: JSON.stringify(diff)
        });
      }

      // In case nothing to compare 'undefined' will be emitted.
      return cb();
    });
  }
}

function prepareGeoQuery(geoJson) {
  return {gid: geoJson[wsToVizabiGeoProperties['gid']]};
}

function getDifference(vizabiCsvGeo, wsGeo) {
  var diff = [];
  _.keys(wsGeo).forEach(function(wsGeoProp) {
    if (wsToVizabiGeoProperties[wsGeoProp] && wsGeo[wsGeoProp] != vizabiCsvGeo[wsToVizabiGeoProperties[wsGeoProp]]) {
      diff.push({
        [wsGeoProp]: wsGeo[wsGeoProp] ? wsGeo[wsGeoProp] : 'ABSENT_IN_WS',
        [wsToVizabiGeoProperties[wsGeoProp]]: vizabiCsvGeo[wsToVizabiGeoProperties[wsGeoProp]] ? vizabiCsvGeo[wsToVizabiGeoProperties[wsGeoProp]] : 'ABSENT_IN_VIZABI'
      });
    }
  });

  if (diff.length) {
    return diff;
  }

  return null;
}

function onlyExistingGeos() {
  return v => v;
}

function parseCsvFile(file, headers, cb) {
  var converter = new Converter({
    workerNum: 4,
    headers: headers,
    flatKeys: true
  });

  converter.on('end_parsed', function (jsonArray) {
    return cb(null, jsonArray);
  });

  fs.createReadStream(file).pipe(converter);
}
