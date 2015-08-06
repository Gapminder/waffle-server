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
  // re-import only specific DS
  //var isFound = false;
  //optionsList = _.filter(optionsList, function (item) {
  //  return
  //  //item.uid === '0ArfEDsV3bBwCdEV1RkJqTEItQnJYVXJlZzVuc3Y3Mmc'
  //  //|| item.uid =='0ArfEDsV3bBwCdFFjMFlMeS02N1NGNjJabl8wamVtdHc'
  //  item.uid =='0ArfEDsV3bBwCcGhBd2NOQVZ1eWowNVpSNjl1c3lRSWc';
  //  if (!isFound) {
  //    isFound = item.uid === '0ArfEDsV3bBwCdEV1RkJqTEItQnJYVXJlZzVuc3Y3Mmc';
  //  }
  //  return isFound;
  //});
  optionsList = optionsList.slice(0,8);

  console.time('All imported!');
  var l = optionsList.length;
  async.eachLimit(optionsList, 1, function (options, cb) {
    console.log('Data source left to import: ' + l--);
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
    process.exit(0);
  });
});

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */
