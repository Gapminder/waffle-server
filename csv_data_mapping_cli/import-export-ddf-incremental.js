const _ = require('lodash');
const async = require('async');

const importDdf = require('./incremental-update-ddf2');
const exportDdf = require('../ws.routes/graphs/export-ddf-tree-updates');

module.exports = (app, onImportExportDdfIncrementalCompleted) => {
  async.waterfall([
    done => importDdf(app, done),
    (exportOptions, done) => exportDdf(app, done, exportOptions)
  ], onImportExportDdfIncrementalCompleted);
};
