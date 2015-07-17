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

  var optionsList = require('./ds_list');
  // optionsList = [{ uid: '0ArfEDsV3bBwCdFVrVDZQUnRwZ2lqT2lPMXcySXZwRmc',
  //   indicator:
  //   { name: 'GNIpercapita_atlasmethod_current_US',
  //     title: 'GNI/capita (Atlas method, current US$)' } }];
  console.time('All imported!');
  var l = optionsList.length;
  async.eachLimit(optionsList, 1, function (options, cb) {
    console.log('Data source left to import: ' + l);
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
    require('./ws.import/neo4j.import');
  });
});

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */


/** @private */
function generateList(serviceLocator) {

  /** @type GoogleSpreadSheetPlugin */
  var gs = serviceLocator.plugins.get('google-spread-sheets');

  var GoogleSpreadsheet = require('google-spreadsheet');
  var someSheet = new GoogleSpreadsheet('192pjt2vtwAQzi154LJ3Eb5RF8W9Fx3ZAiUZy-zXgyJo');
  someSheet.getRows('od5', {'start-index': 1}, function (err2, cells) {
    function parseName(name, title, uid) {
      if (!name || !name.replace(/[^%\w]/g, '')) {
        if (title.replace(/[^%\w]/g, '')) {
          return title.replace(/[^%\w]+/g, '_');
        }
        return uid;
      }

      return name;
    }

    var rows = _.map(cells, function (row) {
      return {
        uid: gs.parser.parse(row.indicatorurl),
        indicator: {
          name: parseName(row.id, row.title, gs.parser.parse(row.indicatorurl)),
          title: row.title
        }
      };
    });

    var exclude = [
      'https://docs.google.com/spreadsheets/d/1aYzLwblTgPVT6Zbexq-V8coTzKr54Fg9JB7rhkzfLbU/pub',
      'https://docs.google.com/spreadsheets/d/1ZMmT3Lj2BCu8AYODni-sbv0Ibeh6mkSsn3DRmJo4rNg/pub',
      'https://docs.google.com/spreadsheets/d/1wQj8YxaeP4MAoMeRh6xZ5AnJkABhufT1UAuE_M5LeB0/pub',
      'https://docs.google.com/spreadsheets/d/1clUeOPK_Rs-ASt2Wl0NWXo-KhOrszkJJ19he7ID4YWY/pub',
      'https://docs.google.com/spreadsheets/d/1tt2bb3fpvOdBaRp1fv39pQ8RjkOb_VbjTi0XdVQEVpI/pub',
      'https://docs.google.com/spreadsheets/d/1erdUA9SDUzZw5M8KfbRL7fgda2XqoAkuvZ1XgGnQ-sY/pub',
      'https://docs.google.com/spreadsheets/d/1bOnlJd00Ygl1nxKrfnmOvkrJ4ruJ_md7WWdrdWYixr0/pub',
      'https://docs.google.com/spreadsheets/d/1FIfJRjfPJSC0S3q5fNUiASC0Xo3j-FlN_kMTPL7FXI0/pub',
      'https://docs.google.com/spreadsheets/d/1MYOjKDFE2z5JBAu5-UhCEjpgxDQF8-0zdReX8BFaPGU/pub',
      'https://docs.google.com/spreadsheets/d/1tj6e75vcdYfDWjz7dNVN-6C8QBJT5OH_OKCTCu2VmjE/pub',
      'https://docs.google.com/spreadsheets/d/1WMpJl70z4epmKyEkqwKDnCJ-_8NcF1WAe18JINslWww/pub',
      'https://docs.google.com/spreadsheets/d/1kB4PFkvhQu2emRcFBMu368wCjVhZzEcbWsXFgFfikJU/pub',
      'https://docs.google.com/spreadsheets/d/1oDVONphUheFEDSlNgaBZsP36KblRXPAG0q1O3vdALsg/pub'
    ];

    var excludeList = _.map(exclude, function (e) {
      return gs.parser.parse(e);
    });

    var indicators = _.filter(rows, function(row) {
      return excludeList.indexOf(row.uid) === -1;
    });

    console.log(indicators);
  });
}
