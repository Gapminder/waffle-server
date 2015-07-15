// import
// save
// analyze
/*eslint-disable*/
var _ = require('lodash');
var async = require('async');
var express = require('express');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);
require('./ws.plugins')(serviceLocator, function () {
  /** @type GoogleSpreadSheetPlugin */
  var gs = serviceLocator.plugins.get('google-spread-sheets');

  var uid = '1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo';
  var indicatorName = 'some-indicator';
  var indicatorTitle = 'Awesome stats here!'
  var optionsList = [
    {
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj0TAlJeCEzcGQ",
      indicator: {
        name: "Children_per_woman_total_fertility",
        title: "Children per woman (total fertility)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj1gkNuUEXOGag",
      indicator: {
        name: "CO2_emissions_tonnes_per_person",
        title: "CO2 emissions (tonnes per person)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj1gkNuUEXOGag",
      indicator: {
        name: "CO2_emissions_tonnes_per_person",
        title: "CO2 emissions (tonnes per person)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj1jiMAkmq1iMg",
      indicator: {
        name: "Income_per_person_GDPpercapita_PPP_inflation_adjusted",
        title: "Income per person (GDP/capita, PPP$ inflation-adjusted)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=0ArfEDsV3bBwCcGhBd2NOQVZ1eWowNVpSNjl1c3lRSWc",
      indicator: {
        name: "Child_mortality_0_5_year_olds_dying_per_1000_born",
        title: "Child mortality (0-5 year-olds dying per 1,000 born)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj2tPLxKvvnNPA",
      indicator: {
        name: "Life_expectancy_years",
        title: "Life expectancy (years)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tFOn62dEO9QCyIKK6kgSYRQ",
      indicator: {
        name: "Aid_given_2007_US",
        title: "Aid given (2007 US$)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tGTst0WEm8V8zI9LOYvGmTg",
      indicator: {
        name: "Aid_given_per_person_2007_US",
        title: "Aid given per person (2007 US$)"
      }
    },
  ];
  console.time('All imported!');
  async.eachLimit(optionsList, 1, function (options, cb) {
    console.time('importing: ' + options.uid);
    gs.importer.importData(options.uid, function (err, opts) {
      console.timeEnd('importing: ' + options.uid);
      if (err) {
        return cb(err);
      }

      console.time('analysing: ' + options.uid);
      _.merge(options, opts);
      gs.analysis(options, function (err) {
        if (err) {
          return cb(err);
        }
        console.timeEnd('analysing: ' + options.uid);
        return cb();
      });
    });
  }, function (err) {
    console.timeEnd('All imported!');
    // export to neo4j
  });

});

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */
