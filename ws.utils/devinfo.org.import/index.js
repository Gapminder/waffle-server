var express = require('express');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var async = require('async');
var http = require('http');
var mongoose = require('mongoose');

var csv = require('ya-csv');
var AdmZip = require('adm-zip');

var rootData = require('./rootData');

var app = express();
var serviceLocator = require('../../ws.service-locator')(app);

require('../../ws.config')(app);
require('../../ws.repository')(serviceLocator);

var DevInfoOrg = mongoose.model('DevInfoOrg');
var Dimensions = mongoose.model('Dimensions');
var DimensionValues = mongoose.model('DimensionValues');
var Indicators = mongoose.model('Indicators');
var IndicatorValues = mongoose.model('IndicatorValues');
var DATA_DIR = './data';

process.on('uncaughtException', function (err) {
  console.log(err);
});

function writeDetail(file, lang, country) {
  return function (cb) {
    return process.nextTick(function () {

      var r = csv.createCsvFileReader(DATA_DIR + '/' + file, {columnsFromHeader: true, 'separator': ','});
      r.addListener('data', function (data) {
        data.Country = country;
        data.Language = lang;
        var devInfoOrg = new DevInfoOrg(data);
        devInfoOrg.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
      });
      r.addListener('end', function () {
        return cb();
      });
      r.on('error', function (err) {
        r.removeAllListeners();
        console.log(file, err);
        cb();
      });
    });
  }
}

function getUnzippedContent(url, id, cb) {
  var tmpFilePath = DATA_DIR + '/tmp/' + id + '.zip';

  return http
    .get(url, function (response) {
      if (response.headers['content-type'] !== 'application/x-zip-compressed') {
        response.resume();
        return cb(null, {url: url, issue: 'non zipped content: ' + response.headers['content-type']});
      }

      response.on('data', function (data) {
        fs.appendFileSync(tmpFilePath, data);
      });

      response.on('end', function () {
        var zip = new AdmZip(tmpFilePath);
        var target = DATA_DIR;
        zip.extractAllTo(target);
        fs.unlink(tmpFilePath);
        return cb(null, {url: url, target: target});
      });
    })
    .on('error', function (err) {
      return cb(null, {url: url, issue: 'non zipped content: ' + err.message});
    });
}

var executions = {
  first: function first(cb) {

    function loader(url, id) {
      return function (cb) {
        return getUnzippedContent(url, id, function (err, data) {
          return cb(err, data);
        });
      }
    }

    var actions = [];
    var id = 0;
    for (var i = 0; i < rootData.meta.Adaptations.length; i++) {
      var record = rootData.meta.Adaptations[i];
      var langs = record.LangCode_CSVFiles.split(',').map(function (lang) {
        return lang;
      });

      langs.forEach(function (lang) {
        if (lang && lang.trim() !== '') {
          var f = record.Name + '_' + record.Adaptation_Year + '_' + lang + '.zip';
          var url = record.Online_URL + '/stock/data/CSV_DataFiles/' + f;
          url = encodeURI(url);

          actions.push(loader(url, id++));
        }
      });
    }

    return async.parallelLimit(actions, 2, function (err, results) {
      results.forEach(function (result) {
        if (result && result.issue) {
          console.log(result.url, result.issue);
        }
      });

      return cb(err, results);
    });
  },
  second: function second(cb) {
    var actions = [];
    for (var i = 0; i < rootData.meta.Adaptations.length; i++) {
      var record = rootData.meta.Adaptations[i];
      var langs = record.LangCode_CSVFiles.split(',').map(function (lang) {
        return lang;
      });

      langs.forEach(function (lang) {
        if (lang && lang.trim() !== '') {
          var file = record.Name + '_' + record.Adaptation_Year + '_' + lang + '.zip';
          var country = _.findWhere(rootData.meta.Areas, {AREANID: record.Area_NId});
          actions.push(writeDetail(file.replace(/\.zip/, '.csv'), lang, !country ? null : country.AREANAME));
        }
      });
    }

    return async.parallelLimit(actions, 5, function (err) {
      if (err) {
        console.log(err);
      }

      return cb();
    });
  },
  third: function third(cb) {

    /**
     * Dimension value processing
     * @param {Object} data
     * @returns {Function}
     */
    function processDimensionValue(data) {
      return function (cb) {
        // Check, if dimension with 'data.value' is exists in DB
        return DimensionValues
          .findOne({value: data.value})
          .lean()
          .exec(function (err, currentDimensionValue) {
            // return it in case of exists
            if (currentDimensionValue && currentDimensionValue._id) {
              return cb(err, {value: data.value, recordId: currentDimensionValue._id});
            }

            // Create new in case of it not exists
            return (new DimensionValues(data))
              .save(function (err, dimensionValue) {
                return cb(err, {value: data.value, recordId: dimensionValue._id});
              });
          });
      }
    }

    return async.waterfall([
      // Get Dimension from current DB
      function getDimensions(cb) {
        console.log('Collect dimensions');
        return Dimensions
          .find({})
          .lean()
          .exec(function (err, dimensions) {
            var pipe = {};
            pipe.dimensions = dimensions;

            console.log('/Collect dimensions');
            return cb(err, pipe);
          });
      },
      // Get dimension values for Countries (existing + new/from temporary table)
      function getCountryValues(pipe, cb) {
        console.log('Collect countries');
        // Get Countries dimension from current DB
        pipe.countryDimension = _.findWhere(pipe.dimensions, {name: 'countries'});

        // Get distinct of countries from temporary DB
        return DevInfoOrg
          .distinct('Country', {Language: 'en'})
          .lean()
          .exec(function (err, countries) {
            var actions = [];
            countries.forEach(function (country) {
              actions.push(processDimensionValue({
                dimension: pipe.countryDimension._id,
                value: country
              }));
            });

            return async.parallel(actions, function (err, results) {
              pipe.countries = {};
              results.forEach(function (result) {
                pipe.countries[result.value] = result.recordId;
              });

              /**
               * return hash that placed in pipe,
               * key is dimension value,
               * value is _id of dimension in DB
               */
              console.log('/Collect countries');
              return cb(err, pipe);
            });
          });
      },
      // Get dimension values for Time Period/Year (existing + new/from temporary table)
      function getTimePeriodValues(pipe, cb) {
        console.log('Collect Times');
        // Get Time Periods dimension from current DB
        pipe.yearDimension = _.findWhere(pipe.dimensions, {name: 'year'});
        // Get distinct of Time Periods from temporary DB
        return DevInfoOrg
          .distinct('Time Period', {Language: 'en'})
          .lean()
          .exec(function (err, timePeriods) {
            var actions = [];
            timePeriods.forEach(function (timePeriod) {
              actions.push(processDimensionValue({
                dimension: pipe.yearDimension._id, value: timePeriod
              }));
            });
            return async.parallel(actions, function (err, results) {
              pipe.timePeriods = {};
              results.forEach(function (result) {
                pipe.timePeriods[result.value] = result.recordId;
              });


              /**
               * return hash that placed in pipe,
               * key is dimension value,
               * value is _id of dimension in DB
               */
              console.log('/Collect Times');
              return cb(err, pipe);
            });
          });
      },
      // Get Indicators (existing + new/from temporary table)
      function getIndicators(pipe, cb) {
        console.log('Collect Indicators');

        function processIndicator(indicatorName) {
          return function (cb) {
            return Indicators
              .findOne({$or: [{name: indicatorName}, {title: indicatorName}]})
              .lean()
              .exec(function (err, currentIndicator) {
                if (currentIndicator && currentIndicator._id) {
                  return cb(err, {value: indicatorName, recordId: currentIndicator._id});
                }

                return (new Indicators({name: indicatorName, title: indicatorName}))
                  .save(function (err, newIndicator) {
                    return cb(err, {value: indicatorName, recordId: newIndicator._id});
                  });
              });
          }
        }

        // Get distinct of Time Periods from temporary DB
        return DevInfoOrg
          .distinct('Indicator', {Language: 'en'})
          .lean()
          .exec(function (err, indicators) {

            var actions = [];
            indicators.forEach(function (indicatorName) {
              actions.push(processIndicator(indicatorName));
            });

            return async.parallelLimit(actions, 5, function (err, results) {
              pipe.indicators = results;

              // return array of indicators
              console.log('/Collect Indicators');
              return cb(err, pipe);
            });
          });
      },
      function fillIndicatorValues(pipe, cb) {
        console.log('Fill Indicator values');

        function addNewIndicatorValue(data) {
          return function (cb) {
            return (new IndicatorValues(data))
              .save(function (err) {
                return cb(err);
              });
          }
        }

        function processIndicatorValue(indicator) {
          console.log('Processing of ' + indicator.value);

          return function (cb) {
            return process.nextTick(function () {
              return DevInfoOrg
                .find({Indicator: indicator.value, Language: 'en'})
                .lean()
                .exec(function (err, values) {
                  var actions = [];
                  values.forEach(function (devInfoValue) {
                    var data = {
                      indicator: indicator.recordId,
                      ds: [{
                        d: pipe.countryDimension,
                        dv: pipe.countries[devInfoValue.Country],
                        v: devInfoValue.Country
                      }, {
                        d: pipe.yearDimension,
                        dv: pipe.timePeriods[devInfoValue['Time Period']],
                        v: devInfoValue['Time Period']
                      }],
                      v: devInfoValue['Data Value']
                    };

                    console.log(data);
                    console.log('---');
                    actions.push(addNewIndicatorValue(data));
                  });

                  return async.parallelLimit(actions, 10, function (err) {
                    console.log('/Processing of ' + indicator.value);
                    return cb(err);
                  });
                });
            });
          }
        }

        // one action -> one indicator
        var actions = [];
        pipe.indicators.forEach(function (indicator) {
          actions.push(processIndicatorValue(indicator));
        });

        return async.parallelLimit(actions, 5, function (err) {
          console.log('/Fill Indicator values');
          return cb(err);
        });
      }
    ], function (err) {
      if (err) {
        console.log(err);
      }

      console.log('The end...');
      return cb(err);
    });
  }
};

/*executions.first(function (err) {
 if (!err) {
 executions.second(function () {
 process.exit(0);
 });
 }
 });*/

if (process.argv.length !== 3) {
  console.log('Usage: node index.js first|second|third');
  process.exit(1);
}

executions[process.argv[2]](function (err) {
  if (err) {
    console.log(err);
  }

  console.log('The end...');
  process.exit(0);
});