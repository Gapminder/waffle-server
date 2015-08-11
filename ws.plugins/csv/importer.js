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
 * @param {String} dsuid - data source unique id in data source space
 * @param {getDataSource} cb - callback, which will be called
 * @returns {CsvImporter} - this, chainable
 */
CsvImporter.prototype.getDataSource = function getDataSource(serviceLocator, options, cb) {
  createFileStream(options, models, cb);

  return this;
};

CsvImporter.prototype.getDataByUid = function getImportData(uid, cb) {
  return this.getDataSource(uid, function (err, dataSource) {
    var spreadSheet;
    var importData;
    var q;

    if (err) {
      return cb(err);
    }

    if (!dataSource.meta || !dataSource.meta.worksheets ||
      dataSource.meta.worksheets.length === 0) {
      return cb(new Error('Worksheets not found!'));
    }

    try {
      spreadSheet = new GoogleSpreadsheet(uid);
      /** @type Array<Models.ImportData> */
      importData = [];
      q = async.queue(function (worksheet, qCb) {
        console.log('loading: ' + worksheet.title);
        spreadSheet.getCells(worksheet.id, {
            'max-row': worksheet.rowCount,
            'max-col': worksheet.colCount
          },
          function (getCellsErr, cells) {
            var data;

            if (getCellsErr) {
              return qCb(getCellsErr);
            }
            // Convert to Import Data format
            data = _.map(cells, function (cell) {
              return {
                   ds: [
                     {
                       d: meta.dimensions.worksheet,
                       v: worksheet.id
                     },
                     {
                       d: meta.dimensions.row,
                       v: cell.row
                     },
                     {
                       d: meta.dimensions.column,
                       v: cell.col
                     }
                   ],
                   v: cell.value
                 };
            });
            console.log(worksheet.title);
            console.log(data.length);

            Array.prototype.push.apply(importData, data);
            return qCb();
          });
      }, 1);

      _.each(dataSource.meta.worksheets, function (worksheets) {
        q.push(worksheets);
      });

      q.drain = function (qErr) {
        return cb(qErr, importData);
      };
    } catch (e) {
      return cb(e);
    }
  });
};

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
  var stream, stats, info, meta;
  var rowCount = 0;
  var colCount = 0;

  var plugin = serviceLocator.plugins.get('csv');

  var fsStream = fs.createReadStream(uid, {flags: 'r'});

  var parser = parse({delimiter: ','});

  var transformer = transform(function(data, _cb){
    console.log('data: ', data);
    return _cb();
  });

  transformer.on('error', function(err){
    cb(err);
  });

  transformer.on('finish', function(){
    // Same as ReadableStream's close event
    stats = fs.statSync(uid);
    info = _.defaults(util.inspect(stats), {rowCount: rowCount, colCount: colCount, title: options.uid});

    meta = {dsuid: options.uid, meta: info, version: info.ctime};

    cb(null, meta);
  });

  fsStream.pipe(parser).pipe(transformer);

  //stream.setEncoding('utf8');
  //// optional string, defaults to '\n'
  ////todo: use custom delimiter
  //stream.setDelimiter('\n');
  //
  //stream.on('error', function(err) {
  //  console.log(err);
  //});
  //
  //stream.on('line', function (line) {
  //  stream.pause();
  //  processLine(line, options, models);
  //});
  //
  //stream.on('close', function() {
  //  // Same as ReadableStream's close event
  //  stats = fs.statSync(uid);
  //  info = _.defaults(util.inspect(stats), {rowCount: rowCount, colCount: colCount, title: uid});
  //
  //  meta = {dsuid: uid, meta: info, version: info.ctime};
  //
  //  cb(null, meta);
  //});

  function processLine(line, options, models) {
    var DELIMITER_CELL = ',';
    // Sends you lines from the stream delimited by delimiter
    if (!rowCount) {
      //todo: use custom delimiter
      colCount = line.split(DELIMITER_CELL).length;
    }

    var ImportData = mongoose.model('ImportData');

    var cells = line.split(DELIMITER_CELL);
    var filter = options.filter;

    if (filter.include && filter.include.indexOf(cells[filter.columnNumber]) < 0) {
      stream.resume();
      return;
    }

    async.forEachOf(cells, function (cell, key, ecb) {
      var ds = [
        {d: plugin.meta.dimensions.filename, v: options.uid},
        {d: plugin.meta.dimensions.column, v: key},
        {d: plugin.meta.dimensions.row, v: rowCount}
      ];
      var query = _.map(ds, function (d) {
        return {ds: {$elemMatch: d}};
      });

      ImportData.update({$and: query},
        {$set: {v: cell, ds: ds}, $addToSet: {importSessions: models.importSession._id}},
        {upsert: true},
        function (err, status) {
          if (err) {
            return ecb(err);
          }

          console.log('status: ', status);

          return ecb();
        }
      );
    }, function (err) {
      console.log('error: ', err);
      rowCount++;
      stream.resume();
    });
  }
}

CsvImporter.prototype.importDataToDb = function getDataSourceCb(err, ds, cb) {
  var l = data.length;
  console.log('Import data values to save: ', l);
  async.eachLimit(data, 500, function (d, cb) {
    l--;
    // if (l % 1000 === 0 || l < 100 && l % 10 === 0 || l < 10) {
    // console.time('Import left to save: ' + l);
    // }
    var ImportData = mongoose.model('ImportData');
    process.nextTick(function () {
      if (!d.v) {
        return cb();
      }

      if (d.v.length > 500) {
        d.v = d.v.substr(0, 500) + '...';
      }
      var query = _.merge(mapCoordinatesToQuery(d.ds), {v: d.v});
      ImportData.update(query, {$addToSet: {importSessions: is._id}}, function (err, status) {
        if (err) {
          return cb(err);
        }

        if (status.nModified) {
          return cb();
        }

        d.importSessions = [is._id];

        return ImportData.create(d, function (err) {
          // if (l % 1000 === 0 || l < 100 && l % 10 === 0 || l < 10) {
          // console.timeEnd('Import left to save: ' + l);
          // }
          return cb(err);
        });
      });
    });
  }, function (err) {
    if (err) {
      console.log(err);
    }
    console.log('import save done!');
    return cb(err, {is: is, ds: ds});
  });
};

function mapCoordinatesToQuery(coordinates) {
  return {
    $and: _.map(coordinates, function (dimensionSet) {
      return {ds: {$elemMatch: dimensionSet}};
    })
  };
}

module.exports = CsvImporter;
