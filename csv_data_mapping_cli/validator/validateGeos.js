'use strict';

let _ = require('lodash');
let fs = require('fs');
let path = require('path');
let async = require('async');
let mongoose = require('mongoose');
let Converter = require('csvtojson').Converter;

const WS_MONGO_URL = process.env.WS_MONGO_URL || 'mongodb://localhost:27017/ws_test';
mongoose.connect(WS_MONGO_URL);

let Geo = require('../../ws.repository/geo.model');

console.time('validationTime');
Geo.find({}, {gid: 1, name: 1, geoRegion4: 1, lat: 1, lng: 1, subdim: 1, _id: 0}).lean().exec((err, geos) => {
  if (err) {
    throw err;
  }

  let allWsGeos = _.indexBy(geos, 'gid');

  let vizabiToWsGeoProperties = {
    'geo': 'gid',
    'geo.name': 'name',
    'geo.cat': 'subdim',
    'geo.region': 'geoRegion4',
    'geo.lat': 'lat',
    'geo.lng': 'lng'
  };

  function mapHeadersToWsCompatible(headers) {
    return _.map(headers, header => vizabiToWsGeoProperties[header])
  }

  let geoValidationTasks = [
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty-geo-properties.csv'),
      headers: mapHeadersToWsCompatible(['geo','geo.name','geo.cat','geo.region','geo.lat','geo.lng'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/usa-geo-properties.csv'),
      headers: mapHeadersToWsCompatible(['geo','geo.name','geo.cat','geo.region'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators-geo-properties.csv'),
      headers: mapHeadersToWsCompatible(['geo', 'geo.name', 'geo.cat', 'geo.region'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators.csv'),
      headers: mapHeadersToWsCompatible(['geo'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty.csv'),
      headers: mapHeadersToWsCompatible(['geo'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty-withmini.csv'),
      headers: mapHeadersToWsCompatible(['geo'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/swe.csv'),
      headers: mapHeadersToWsCompatible(['geo'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/usa.csv'),
      headers: mapHeadersToWsCompatible(['geo'])
    },
    {
      file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators.csv'),
      headers: mapHeadersToWsCompatible(['geo'])
    }
  ];

  geoValidationTasks = geoValidationTasks.concat(_.range(1800, 2016).map(year => {
    return {
      file: path.resolve(__dirname, `../data/vizabi/waffles/dont-panic-poverty-${year}.csv`),
      headers: mapHeadersToWsCompatible(['geo'])
    };
  }));

  let geoValidators = _.map(geoValidationTasks, validateGeos);

  async.parallelLimit(geoValidators, 1,
    (err, groupedByGidGeoResults) => {
      console.log(mergeGroupedByGidGeoResults(groupedByGidGeoResults));
      console.timeEnd('validationTime');
  });

  function mergeGroupedByGidGeoResults(groupedByGidGeoResults) {
    let reduceInitialValue = {};
    return _.reduce(groupedByGidGeoResults, (groupedByGidGeoResultPeace, next) => {
      return _.merge(groupedByGidGeoResultPeace, next, (a, b) => {
        if (_.isArray(a)) {
          return a.concat(b);
        }
      });
    }, reduceInitialValue);
  }

  function validateGeos(geoValidationTask) {
    return onValidationComplete => {
      async.waterfall(
        [
          //Parse csv with geos
          cb => parseCsvFile(geoValidationTask.file, geoValidationTask.headers, cb),
          //Map each record into comparison actions in order to detect diffs
          (csvRecords, cb) => {
            let comparisonActions = _.map(csvRecords, (geoJson, rowNum) => {
              return createComparisonAction(geoValidationTask, geoJson, rowNum);
            });
            return cb(null, comparisonActions);
          },
          //Execute comparison actions and group them by gid
          (comparisonActions, cb) => {
            async.series(comparisonActions, (err, comparedGeos) => {
              let groupedByGidGeoResults =
                _.chain(comparedGeos)
                  .compact()
                  .groupBy(comparedGeo => comparedGeo.gid)
                  .value();

              return cb(err, groupedByGidGeoResults);
            });
          }
        ],
        //Execute callback on validation complete
        (err, groupedByGidGeoResults) => {
          if (err) {
            return onValidationComplete(err);
          }

          console.log(`processed file ${geoValidationTask.file}`);
          return onValidationComplete(null, groupedByGidGeoResults);
        });
    }
  }

  function createComparisonAction(task, geoJson, rowNum) {
    return cb => {
      let gid = geoJson.gid;
      let wsGeo = allWsGeos[gid];
      let diff = getDifference(task.headers, geoJson, wsGeo);

      if (!wsGeo || diff.length) {
        return cb(null, {
          file: task.file,
          vizabiCsvRowNum: rowNum + 2,
          gid: wsGeo && wsGeo.gid ? wsGeo.gid : `ABSENT_IN_WS: ${gid}`,
          diff: JSON.stringify(diff)
        });
      }

      // In case nothing to compare 'undefined' will be emitted.
      return cb();
    }
  }

  function getDifference(headers, vizabiGeo, wsGeo) {
    let diff = [];
    _.chain(_.keys(wsGeo))
      .filter(prop => headers.indexOf(prop) !== -1)
      .each(prop => {
        let wsValue = wsGeo[prop];
        let vizabiValue = vizabiGeo[prop];

        if (wsValue != vizabiValue) {
          diff.push({
            [prop]: wsValue ? wsValue : 'ABSENT_IN_WS',
            [`${prop}(vizabi)`]: vizabiValue ? vizabiValue : 'ABSENT_IN_VIZABI'
          });
        }
      })
      .value();
    return diff;
  }

  function parseCsvFile(file, headers, cb) {
    let converter = new Converter({
      workerNum: 4,
      headers: headers,
      flatKeys: true
    });

    converter.on('end_parsed', jsonArray => {
      return cb(null, jsonArray);
    });

    fs.createReadStream(file).pipe(converter);
  }
});
