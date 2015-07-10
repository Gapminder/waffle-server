'use strict';

var _ = require('lodash');
var async = require('async');
var GoogleSpreadsheet = require('google-spreadsheet');

var meta = require('./plugin-meta');

function GoogleSpreadSheetImporter() {
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
 * @returns {GoogleSpreadSheetImporter} - this, chainable
 */
GoogleSpreadSheetImporter.prototype.getDataSource = function getDataSource(dsuid, cb) {
  // todo: consumer should add dst, user and compare version
  try {
    var spreadSheet = new GoogleSpreadsheet(dsuid);
    // todo: add jsdoc
    spreadSheet.getInfo(function (err, spreadsheet) {
      if (err) {
        return cb(err);
      }
      //spreadsheet = _.omit(spreadsheet, _.isFunction);
      return cb(null, {
        dsuid: dsuid,
        meta: spreadsheet,
        version: spreadsheet.updated
      });
    });
  } catch (e) {
    cb(e);
  }

  return this;
};

GoogleSpreadSheetImporter.prototype.getDataByUid = function getImportData(uid, cb) {
  return this.getDataSource(uid, function (err, dataSource) {
    if (err) {
      return cb(err);
    }

    if (!dataSource.meta || !dataSource.meta.worksheets ||
      dataSource.meta.worksheets.length === 0) {
      return cb(new Error('Worksheets not found!'));
    }

    try {
      var spreadSheet = new GoogleSpreadsheet(uid);
      /** @type Array<Models.ImportData> */
      var importData = [];
      var q = async.queue(function (worksheet, qCb) {
        console.log('loading: ' + worksheet.title);
        spreadSheet.getCells(worksheet.id, {
            'max-row': worksheet.rowCount,
            'max-col': worksheet.colCount
          },
          function (getCellsErr, cells) {
            if (getCellsErr) {
              return qCb(getCellsErr);
            }
            // Convert to Import Data format
            var data = _.map(cells, function (cell) {
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

module.exports = GoogleSpreadSheetImporter;
