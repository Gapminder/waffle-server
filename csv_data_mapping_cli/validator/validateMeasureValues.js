'use strict';

let _ = require('lodash');
let fs = require('fs');
let path = require('path');
let async = require('async');
let mongoose = require('mongoose');
let Converter = require('csvtojson').Converter;

const WS_MONGO_URL = process.env.WS_MONGO_URL || 'mongodb://localhost:27017/ws_test';
mongoose.connect(WS_MONGO_URL);

let IndicatorsValues = require('../../ws.repository/indicator-values/indicator-values.model');

let measureValuesTasks = _.range(1800, 2016).map((year) => {
  return {
    file: path.resolve(__dirname, `../data/vizabi/waffles/dont-panic-poverty-${year}.csv`),
    headers: ['geo','time','pop','gdp_pc','gini','u5mr'],
    measureNames: ['pop','gdp_pc','gini','u5mr']
  };
});

measureValuesTasks = measureValuesTasks.concat([
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty.csv'),
    headers: ['geo','time','pop','gdp_pc','gini','u5mr'],
    measureNames: ['pop','gdp_pc','gini','u5mr']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty-withmini.csv'),
    headers: [
      'geo',
      'geo.name',
      'geo.cat',
      'geo.region',
      'time',
      'pop',
      'gdp_pc',
      'gini',
      'u5mr',
      'size'
    ],
    measureNames: ['pop','gdp_pc','gini','u5mr']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/swe.csv'),
    headers: ['geo','time','age','pop'],
    measureNames: ['pop']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/usa.csv'),
    headers: ['geo','time','age','pop'],
    measureNames: ['pop']
  },
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/basic-indicators.csv'),
    headers: ['geo','time','gdp_pc','lex','pop'],
    measureNames: ['gdp_pc','lex','pop']
  }
]);

let measureValuesValidators = _.map(measureValuesTasks, validateMeasureValues);

console.time('validationTime');
async.parallelLimit(measureValuesValidators, 1, err => console.timeEnd('validationTime'));

function validateMeasureValues(measureValuesValidationTask) {
  return onValidationComplete => {
    async.waterfall(
      [
        //Parse csv with measure values
        cb => parseCsvFile(measureValuesValidationTask.file, measureValuesValidationTask.headers, cb),
        //Map each record into comparison actions in order to detect diffs
        (csvRecords, cb) => {
          let comparisonActions = _.map(csvRecords, (measureJson, rowNum) => {
            return _.map(measureValuesValidationTask.measureNames,
              (measureName) => createComparisonAction(measureName, measureJson, measureValuesValidationTask.file, rowNum));
          });
          return cb(null, _.flatten(comparisonActions));
        },
        //Execute comparison actions and group them by measure name
        (comparisonActions, cb) => {
          async.parallelLimit(comparisonActions, 200, (err, comparedMeasureValues) => {
            let groupedByMeasureNameValues =
              _.chain(comparedMeasureValues)
              .compact()
              .groupBy(measure => measure.indicator)
              .value();

            return cb(err, groupedByMeasureNameValues);
          });
        }
      ],
      //Execute callback on validation complete.
      (err, groupedByMeasureNameValues) => {
        if (err) {
          return onValidationComplete(err)
        }

        console.log(`processed file ${measureValuesValidationTask.file}`);
        console.log('diff: ', groupedByMeasureNameValues);
        return onValidationComplete(null, groupedByMeasureNameValues)
      });
  }
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

function createComparisonAction(measureName, measureJson, file, rowNum) {
  return cb => {
    let measureValuesQuery = prepareMeasureValueQuery(measureName, measureJson);

    return IndicatorsValues.findOne(measureValuesQuery).lean().exec((err, indicator) => {
      if (err) {
        return cb(err);
      }

      let vizabiMeasureValue = measureJson[measureName];
      if (!indicator || vizabiMeasureValue != indicator.value) {
        return cb(null, {
          file: file,
          rowNum: rowNum + 2,
          year: measureJson.time,
          gid: measureJson.geo,
          indicator: measureName,
          wsValue: indicator ? indicator.value : 'ABSENT_IN_WS',
          vizabiValue: vizabiMeasureValue ? vizabiMeasureValue : 'ABSENT_IN_VIZABI'
        });
      }
      // In case nothing to compare - 'undefined' will be emitted.
      return cb();
    });
  }
}

function prepareMeasureValueQuery(measureName, measureJson) {
  return {
    indicatorName: measureName,
    $and: [
      {coordinates: {
        $elemMatch: {
          dimensionName: 'year',
          value: measureJson.time}}
      },
      {coordinates: {
        $elemMatch: {
          dimensionName: 'country',
          value: measureJson.geo}}
      }]
  };
}
