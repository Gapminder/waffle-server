'use strict';
var _ = require('lodash');

function GoogleSpreadSheetPlugin(serviceLocator) {
  var self = this;
  this.meta = require('./plugin-meta');
  serviceLocator.plugins.set(this.meta.name, this);
  this.parser = require('./parser');

  var Importer = require('./importer');
  // todo: refactor
  Importer.prototype.importData = function importData(uid, cb) {
    console.log('Start import of: ' + uid);
    uid = self.parser.parse(uid);
    console.log('Parsed uid: ' + uid);
    // fixme: user, data source type
    var mongoose = require('mongoose');
    var user = {
      "_id" : "55a779dd1083ec4c438f347b",
      "email" : "gapdata@gmail.com",
      "name" : "gapdata"
    };
    /** @type GoogleSpreadSheetPlugin */
    var gs = serviceLocator.plugins.get('google-spread-sheets');

    /** @type DataSourcesRepository */
    var dsRepo = serviceLocator.repositories.get('data-sources');

    /** @type DataSourcesRepository */
    var dstRepo = serviceLocator.repositories.get('data-source-types');

    gs.importer.getDataSource(uid, function (err, ds) {
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
    });
  };

  this.importer = new Importer();
  this.analysis = require('./analysis.colors-spreadsheets')(serviceLocator).analyse;
}

module.exports = function (serviceLocator) {
  return new GoogleSpreadSheetPlugin(serviceLocator);
};

function mapCoordinatesToQuery(coordinates) {
  return {
    $and: _.map(coordinates, function (dimensionSet) {
      return {ds: {$elemMatch: dimensionSet}};
    })
  };
}
