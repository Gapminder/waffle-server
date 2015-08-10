'use strict';

var mongoose = require('mongoose');

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var LineInputStream = require('line-input-stream');
var util = require('util');

var meta = require('./plugin-meta');

function CsvImporter() {
}

/**
 * @callback getDataSource
 * @param {Error} err - error
 * @param {Models.DataSources} dataSource - formatted data source
 */

/**
 * Load data source instance
 * @param {String} dsuid - data source unique id in data source space
 * @param {getDataSource} cb - callback, which will be called
 * @returns {CsvImporter} - this, chainable
 */
CsvImporter.prototype.getDataSource = function getDataSource(plugin, dsuid, cb) {
  var stream;
  var stats;
  var info;
  var meta;
  var rowCount = 0;
  var colCount = 0;

  // todo: consumer should add dst, user and compare version
  try {
    stream = LineInputStream(fs.createReadStream(dsuid, {flags: 'r'}));

    stream.setEncoding('utf8');
    // optional string, defaults to '\n'
    //todo: use custom delimiter
    stream.setDelimiter('\n');

    stream.on('error', function(err) {
      console.log(err);
    });

    stream.on('line', function(line) {
      // Sends you lines from the stream delimited by delimiter
      if (!rowCount) {
        //todo: use custom delimiter
        colCount = line.split(',').length;
      }
      rowCount++;
    });

    stream.on('end', function() {
      // No more data, all line events emitted before this event
    });

    stream.on('close', function() {
      // Same as ReadableStream's close event
      stats = fs.statSync(dsuid);
      info = _.defaults(util.inspect(stats), {rowCount: rowCount, colCount: colCount, title: dsuid});

      meta = {dsuid: dsuid, meta: info, version: info.ctime};

      cb(null, meta);
    });

    if (stream.readable) {
      console.log('stream is readable');
    }
  } catch (e) {
    cb(e);
  }

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

CsvImporter.prototype.importData = function importData(serviceLocator, uid, cb) {
  plugin.importer.getDataSource(plugin, uid, cb);
};

CsvImporter.prototype.importDataToDb = function getDataSourceCb(err, ds, cb) {
  dstRepo.findByName(gs.meta.name, function (err, dst) {
    ds.dst = dst._id;
    ds.user = user;

    dsRepo.add(ds, function (err, dataSource) {
      var ImportSessions = mongoose.model('ImportSessions');
      ImportSessions.create({
        ds: dataSource._id,
        user: user._id
      }, function (err, is) {
        gs.importer.getDataByUid(uid, function (err, data) {
          var async = require('async');
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
        });
      });
    });
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
