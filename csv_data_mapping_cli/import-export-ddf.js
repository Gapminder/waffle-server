const _ = require('lodash');
const async = require('async');

const importDdf = require('./import-ddf2');
const exportDdf = require('../ws.routes/graphs/export.service');

module.exports = (app, onImportExportDdfCompleted) => {
  async.waterfall([
    done => importDdf(app, done),
    (exportOptions, done) => exportDdf(app, done, exportOptions)
  ], onImportExportDdfCompleted);
};
