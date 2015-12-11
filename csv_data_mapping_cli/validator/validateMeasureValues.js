var Converter = require('csvtojson').Converter;
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var async = require('async');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ws_test');
var IndicatorsValues = require('../../ws.repository/indicator-values/indicator-values.model');

var measureValuesTasks = _.range(1800, 2016).map((year) => {
  return {
    file: path.resolve(__dirname, `../data/vizabi/waffles/dont-panic-poverty-${year}.csv`),
    headers: ['geo','time','pop','gdp_per_cap','gini','u5mr'],
    measureNames: ['pop','gdp_per_cap','gini','u5mr']
  };
});

measureValuesTasks = measureValuesTasks.concat([
  {
    file: path.resolve(__dirname, '../data/vizabi/waffles/dont-panic-poverty.csv'),
    headers: ['geo','time','pop','gdp_per_cap','gini','u5mr'],
    measureNames: ['pop','gdp_per_cap','gini','u5mr']
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
      'gdp_per_cap',
      'gini',
      'u5mr',
      'size'
    ],
    measureNames: ['pop','gdp_per_cap','gini','u5mr']
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
    headers: ['geo','time','gdp_per_cap','lex','pop'],
    measureNames: ['gdp_per_cap','lex','pop']
  }
]);

async.parallelLimit(_.map(measureValuesTasks,
  (task) =>
    (cb) => {
      validateMeasureValues(task, groupedByMeasureResults => {
        console.log(`processed file ${task.file}`);
        console.log('diff: ', groupedByMeasureResults);
        cb(null, groupedByMeasureResults)
      })
    }), 1, err => console.log('Validation is completed.'));

function validateMeasureValues(measureValuesValidationTask, onValidationComplete) {
  async.waterfall(
    [
      //Parse csv with measure values
      cb => parseCsvFile(measureValuesValidationTask.file, measureValuesValidationTask.headers, (err, csvRecords) => {
        return cb(err, csvRecords);
      }),
      //Map each record into comparison actions in order to detect diffs
      (csvRecords, cb) => {
        var comparisonActions = _.map(csvRecords, (measureJson, rowNum) => {
          return _.map(measureValuesValidationTask.measureNames, (measureName) =>
            createComparisonAction(measureName, measureJson, measureValuesValidationTask.file, rowNum));
        });
        return cb(null, _.flatten(comparisonActions));
      },
      //Execute comparison actions and group them by measure name
      (comparisonActions, cb) => {
        async.parallelLimit(comparisonActions, 200, (err, comparedMeasureValues) => {
          cb(err, _.groupBy(_.filter(comparedMeasureValues, onlyExistingValues()), (measure) => measure.indicator));
        });
      }
    ],
    //Execute callback on validation complete.
    (err, groupedByMeasureNameValues) => {
      if (err) {
        console.error(err);
      }
      onValidationComplete(groupedByMeasureNameValues)
    });
}

function onlyExistingValues() {
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

function createComparisonAction(measureName, measureJson, file, rowNum) {
  return (cb) => {
    return IndicatorsValues.findOne(prepareMeasureValueQuery(measureName, measureJson)).lean().exec((err, indicator) => {
      if (err) {
        return cb(err);
      }

      if (!indicator || measureJson[measureName] != indicator.value) {
        return cb(null, {
          file: file,
          rowNum: rowNum + 2,
          year: measureJson.time,
          gid: measureJson.geo,
          indicator: measureName,
          wsValue: indicator ? indicator.value : 'ABSENT_IN_WS',
          vizabiValue: measureJson[measureName] ? measureJson[measureName] : 'ABSENT_IN_VIZABI'
        });
      }
      // In case nothing to compare 'undefined' will be emitted.
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
