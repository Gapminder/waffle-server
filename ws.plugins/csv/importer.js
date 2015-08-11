'use strict';

var mongoose = require('mongoose');

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var parse = require('csv-parse');
var transform = require('stream-transform');
var util = require('util');

var meta = require('./plugin-meta');

function CsvImporter() {
}

/**
 * Load data source instance
 * @param {Object} serviceLocator - service for getting different needed models
 * @param {Object} options - all needed info for import data (dimensions, filter, indicator)
 * @param {Object} models - data source type, data source, import session
 * @param {Function} cb - callback, which will be called after updating Import Data collection
 * @returns {CsvImporter} - this, chainable
 */

CsvImporter.prototype.importData = function importData(serviceLocator, options, models, cb) {
  //var uid = options.uid;

  createFileStream(serviceLocator, options, models, cb);

  return this;
};

function createFileStream(serviceLocator, options, models, cb) {
  var uid = options.uid;
  var meta;
  var info;
  var result;
  var rowCount = 0;
  var colCount = 0;

  var plugin = serviceLocator.plugins.get('csv');

  var fsStream = fs.createReadStream(uid, {flags: 'r'});

  var parser = parse({delimiter: ','});

  var transformer = transform(function(data, _cb) {
    processLine(data, _cb);
  }, {parallel: 1});

  transformer.on('error', function(err) {
    cb(err);
  });

  transformer.on('finish', function() {
    // Same as ReadableStream's close event
    info = util.inspect(fs.statSync(uid));
    meta = {rowCount: rowCount, colCount: colCount, title: options.dsuid};

    result = {stats: {dsuid: options.dsuid, meta: meta, version: info.ctime}, is: models.importSession, ds: models.ds};

    cb(null, result);
  });

  fsStream.pipe(parser).pipe(transformer);

  function processLine(cells, tcb) {
    var ImportData = mongoose.model('ImportData');

    var filter = options.filter;

    if (!rowCount) {
      colCount = cells.length;
    }

    if (rowCount && filter.includeValues && filter.includeValues.indexOf(cells[filter.columnNumber]) < 0) {
      return tcb();
    }

    async.eachSeries(cells, function (cell, ecb) {
      var key = cells.indexOf(cell);
      var ds = [
        {d: plugin.meta.dimensions.filename, v: options.dsuid},
        {d: plugin.meta.dimensions.column, v: key},
        {d: plugin.meta.dimensions.row, v: rowCount}
      ];

      var query = _.map(ds, function (d) {
        return {ds: {$elemMatch: d}};
      });

      ImportData.update({$and: query},
        {$set: {v: cell, ds: ds}, $addToSet: {importSessions: models.importSession._id}},
        {upsert: true},
        function (err) {
          if (err) {
            return ecb(err);
          }

          return ecb();
        }
      );
    }, function (err) {
      rowCount++;

      tcb(err);
    });
  }
}

module.exports = CsvImporter;
