'use strict';

var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();

  app.get('/api/admin/import-data', getImportData);

  function getImportData(req, res) {
    var importSession = _.trim(req.query.importSession);

    async.waterfall([
      getMetaData,
      handleMetaData,
      getData
    ], sendResult);

    function getMetaData(cb) {
      mongoose.model('ImportSessions')
        .findOne({_id: importSession})
        .populate('ds')
        .lean()
        .exec(function (err, data) {
          if (!data || !data.ds|| !data.ds.meta || !data.ds.meta.worksheets) {
            return cb('No meta in DataSource document "' + importSession + '"');
          }
          return cb(err, data.ds.meta.worksheets);
        });
    }

    function handleMetaData(metadata, cb) {
      var _tab = {id: '', title: '', rowCount: 0, colCount: 0, data: []};
      var template = {};

      _.each(metadata, function (worksheet) {
        var tab = _.assign(_.clone(_tab), worksheet);
        var row = new Array(tab.colCount);
        var data = [];
        for (var key = 0; key < tab.rowCount; key++) {
          data.push(_.clone(row));
        }

        tab.data = data;
        template[tab.id] = tab;
      });

      return cb(null, {data: template, metadata: metadata});
    }

    function getData(template, cb) {
      var result = template.data;

      mongoose.model('ImportData').find({importSessions: importSession})
        .lean()
        .exec(function (err, data) {
          if (err || !data.length) {
            return cb('No matched data.', {data: null});
          }

          _.each(data, function (doc) {
            var ds = _.indexBy(doc.ds, 'd');

            result[ds['gs-worksheet'].v].data[ds['gs-row'].v - 1][ds['gs-column'].v - 1] = doc.v;
          });

          return cb(err, {data: result, metadata: template.metadata});
      });
    }

    function sendResult(err, result) {
      if (err) {
        return res.json({error: err, data: result});
      }

      return res.json({success: true, data: result});
    }
  }
};
