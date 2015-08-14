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
  var ImportData = mongoose.model('ImportData');
  var bulk = ImportData.collection.initializeUnorderedBulkOp();

  var fsStream = fs.createReadStream(uid, {flags: 'r'});

  var parser = parse({delimiter: ','});

  var transformer = transform(function(data, _cb) {
    processLine(data, _cb);
  }, {parallel: 1});

  fsStream.on('data', function(chunk) {
    console.log('got %d bytes of data', chunk.length);
  });

  fsStream.on('error', function(err) {
    console.error(err);
    cb(err);
  });

  transformer.on('pipe', function(chunk) {
    console.log('start transform processing', chunk.length);
  });

  transformer.on('error', function(err) {
    console.error(err);
    cb(err);
  });

  transformer.on('finish', function() {
    console.log('  Start Bulk Upsert for ' + rowCount * colCount + ' cell(s)...');

    bulk.execute(function (err) {
      if (err) {
        return cb(err.errmsg);
      }
      console.log('  Finished Bulk Upsert...');
    });

    async.whilst(
      function () {
        if (bulk.s) {
          console.log('    Bulk Upsert in progress...');
        }
        return bulk && bulk.s && bulk.s.bulkResult && bulk.s.bulkResult.nMatched === 0 && bulk.s.bulkResult.nUpserted === 0;
      },
      function (callback) {
        setTimeout(callback, 5000);
      },
      function () {
        // Same as ReadableStream's close event
        info = util.inspect(fs.statSync(uid));
        meta = {rowCount: rowCount, colCount: colCount, title: options.dsuid};

        result = {
          stats: {
            dsuid: options.dsuid,
            meta: meta,
            version: info.ctime
          },
          is: models.importSession._id,
          ds: models.ds
        };

        cb(null, result);
      }
    );
  });

  fsStream.pipe(parser).pipe(transformer);

  function processLine(cells, tcb) {
    var filter = options.filter;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    if (!rowCount) {
      colCount = cells.length;
    }

    if (rowCount && filter && filter.includeValues && filter.includeValues.indexOf(cells[filter.colNumber]) < 0) {
      return tcb();
    }

    _.each(cells, function (cell, key) {
      var ds = [
        {d: plugin.meta.dimensions.filename, v: options.dsuid},
        {d: plugin.meta.dimensions.column, v: key},
        {d: plugin.meta.dimensions.row, v: rowCount}
      ];

      var query = _.map(ds, function (d) {
        return {ds: {$elemMatch: d}};
      });

      bulk
        .find({$and: query})
        .upsert()
        .updateOne({$setOnInsert: {v: cell, ds: ds}, $addToSet: {importSessions: models.importSession._id}});
    });

    rowCount++;

    return tcb();
  }
}

module.exports = CsvImporter;
