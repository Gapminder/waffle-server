'use strict';

var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');
var path = require('path');

/**
 * Register plugins
 * @param {ServiceLocatorContainer} serviceLocator - service locator
 * @returns {void} - nothing
 */
module.exports = function (serviceLocator, cb) {
  /** @type DataSourceTypesRepository */
  var dataSourceTypesRepository = serviceLocator.repositories.get('data-source-types');

  // todo: can be generic
  async.waterfall([
    //function (wcb) {
    //  registerPlugin(require('./google-spread-sheets')(serviceLocator), runImportGoogleSpreadSheets(wcb));
    //}
    function (wcb) {
      registerPlugin(require('./csv')(serviceLocator), runImportCsv(wcb));
    }
  ], function (err) {
    cb(err);
  });

  function registerPlugin(plugin, registerCb) {
    serviceLocator.plugins.set(plugin.meta.name, plugin);
    dataSourceTypesRepository.add(plugin.meta, registerCb);
  }

  function runImportCsv(_cb) {
    return function () {
      // Limit of the data source elements
      var optionsList = require('../ds-csv-list').slice(0, 2);
      var l = optionsList.length;

      console.time('All imported!');

      async.eachSeries(optionsList, function (options, ecb) {
        _runImportCsv(options, function (err) {
          if (!err) {
            console.log('Data source left to import: ' + --l);
          }

          ecb(err);
        });
      }, function (err) {
        console.timeEnd('All imported!');

        _cb(err);
      });
    };
  }

  function _runImportCsv(options, _cb) {
    /** @type CsvPlugin */
    var plugin = serviceLocator.plugins.get('csv');

    // fixme: user, data source type
    var user = {
      _id: '55a779dd1083ec4c438f347b',
      email: 'gapdata@gmail.com',
      name: 'gapdata'
    };

    console.log('Start import of: ' + options.uid);

    async.waterfall([
      function _parseData(wfcb) {
        plugin.parser.parse(options.uid, function (err, opts) {
          if (err) {
            return wfcb(err);
          }
          _.defaultsDeep(options, opts);

          return wfcb();
        });
      },
      function _getDataSourceType(wfcb) {
        /** @type DataSourcesRepository */
        var dstRepo = serviceLocator.repositories.get('data-source-types');

        dstRepo.findByName(plugin.meta.name, function (err, dst) {
          return wfcb(err, dst);
        });
      },
      function _createOrUpdateDataSource(dst, wfcb) {
        /** @type DataSourcesRepository */
        var dsRepo = serviceLocator.repositories.get('data-sources');

        var ds = {
          dst: dst._id,
          user: user,
          dsuid: path.basename(options.uid, '.csv')
        };

        dsRepo.add(ds, function (err, dataSource) {
          return wfcb(err, {ds: dataSource, dst: dst, user: user});
        });
      },
      function _createImportSession(models, wfcb) {
        var ImportSessions = mongoose.model('ImportSessions');
        var is = {
          ds: models.ds._id,
          user: models.user._id
        };

        ImportSessions.create(is, function (err, importSession) {
          if (err) {
            return wfcb(err);
          }

          models.importSession = importSession.toJSON();
          return wfcb(null, models);
        });
      },
      function _importData(models, wfcb) {
        console.time('imported: ' + options.uid);
        plugin.importer.importData(serviceLocator, options, models, function (err, opts) {
          console.timeEnd('imported: ' + options.uid);

          if (err) {
            return wfcb(err);
          }

          _.merge(options, opts);

          return wfcb();
        });
      },
      function _analyseData(wfcb) {
        console.time('analysing: ' + options.uid);
        plugin.analysis(options, function (err) {
          console.timeEnd('analysing: ' + options.uid);

          if (err) {
            return wfcb(err);
          }

          return wfcb();
        });
      }
    ], function (err) {
      _cb(err);
    });
  }

  function runImportGoogleSpreadSheets(cb) {
    return function () {
      /** @type GoogleSpreadSheetPlugin */
      var gs = serviceLocator.plugins.get('google-spread-sheets');

      var optionsList = require('../ds_list');
      var l;

      // Limit of the data source elements
      optionsList = optionsList.slice(0, 8);

      console.time('All imported!');
      l = optionsList.length;

      async.eachLimit(optionsList, 1, function (options, ecb) {
        console.log('Data source left to import: ' + l--);
        console.time('importing: ' + options.uid);

        gs.importer.importData(options.uid, function (err, opts) {
          console.timeEnd('importing: ' + options.uid);

          if (err) {
            return ecb(err);
          }

          console.time('analysing: ' + options.uid);

          _.merge(options, opts);

          //todo: refactor it!!!
          gs[options.tableName !== '' ? 'analysisColorsSpreadsheets' : 'analysis'](options, function (_err) {
            if (_err) {
              return ecb(_err);
            }

            console.timeEnd('analysing: ' + options.uid);

            return ecb();
          });
        });
      }, function (err) {
        if (!err) {
          console.timeEnd('All imported!');
        }

        cb(err);
      });
    };
  }
};
