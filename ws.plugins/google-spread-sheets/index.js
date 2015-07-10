'use strict';
function GoogleSpreadSheetPlugin(serviceLocator) {
  this.meta = require('./plugin-meta');
  serviceLocator.plugins.set(this.meta.name, this);
  this.parser = require('./parser');

  var Importer = require('./importer');
  // todo: refactor
  Importer.prototype.importData = function importData(uid, cb) {
    // fixme: user, data source type
    var mongoose = require('mongoose');
    var Users = mongoose.model('Users');
    var user = new Users({
      _id: mongoose.Types.ObjectId(),
      name: 'test',
      email: 'test@test.com'});
    /** @type GoogleSpreadSheetPlugin */
    var gs = serviceLocator.plugins.get('google-spread-sheets');

    /** @type DataSourcesRepository */
    var dsRepo = serviceLocator.repositories.get('data-sources');

    /** @type DataSourcesRepository */
    var dstRepo = serviceLocator.repositories.get('data-source-types');

    gs.importer.getDataSource(uid, function(err, ds){
      dstRepo.findByName(gs.meta.name, function (err, dst){
        ds.dst = dst._id;
        ds.user = user;

        dsRepo.add(ds, function(err, dataSource) {
          var ImportSessions = mongoose.model('ImportSessions');
          ImportSessions.create({
            ds: dataSource._id,
            user: user._id
          }, function (err, is) {
            gs.importer.getDataByUid(uid, function (err, data) {
              var async = require('async');
              async.eachLimit(data, 500, function (d, cb) {
                var ImportData = mongoose.model('ImportData');
                process.nextTick(function () {
                  ImportData.update(d, {$addToSet: {importSessions: is._id}}, function (err, status){
                    if (err) {
                      return err;
                    }

                    if (status.nModified) {
                      return cb(err);
                    }

                    d.importSessions = [is._id];
                    return ImportData.create(d, function(err){cb(err);});
                  });
                });
              }, function(err){
                if (err) {
                  console.log(err);
                }
                console.log('done!');
                return cb(err);
              });
            });
          });
        });
      });
    });
  };

  this.importer = new Importer();
  this.analysis = require('./analysis')(serviceLocator);
}

module.exports = function (serviceLocator) {
  return new GoogleSpreadSheetPlugin(serviceLocator);
};
