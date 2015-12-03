var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var AWS = require('aws-sdk');

var cors = require('./cors')(['POST', 'GET', 'DELETE']);

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var buildTypeAwareAuth = require('./build-type-aware-auth')(serviceLocator);
  var ensureAuthenticated = buildTypeAwareAuth.ensureAuthenticated;
  var authUserSyncMiddleware = buildTypeAwareAuth.authUserSyncMiddleware;

  var Files = mongoose.model('Files');

  var s3 = new AWS.S3({region: 'eu-west-1', params: {Bucket: process.env.S3_BUCKET}});

  app.options('/api/files', cors);

  app.get('/api/files', cors, ensureAuthenticated, authUserSyncMiddleware, function (req, res) {
    var user = req.user;
    var limit = req.query.limit || 10;
    var skip = req.query.skip || 0;
    var query = {owners: user._id};
    if (req.query.search) {
      query.$or = [];
      query.$or = _.map(['uri', 'name', 'ext'], function (key) {
        var q = {};
        q[key] = new RegExp(req.query.search, 'ig');
        return q;
      });
    }

    async.parallel({
      files: function (cb) {
        return Files.find(query, {uri: 1, name: 1, ext: 1, size: 1})
          .limit(limit).skip(skip).lean(true)
          .exec(cb);
      },
      count: function (cb) {
        return Files.count({owners: user._id}, cb);
      }
    }, function (err, results) {
      return res.json({success: !err, data: results, error: err});
    });
  });

  app.delete('/api/files', cors, ensureAuthenticated, authUserSyncMiddleware, function (req, res) {
    var file = JSON.parse(req.query.file);

    s3.deleteObject({
      Bucket: process.env.S3_BUCKET,
      Key: 'original' + file.uri.substring(file.uri.lastIndexOf('/'))
    }, function (err, result) {
      if (err) {
        return res.json({success: !err, data: result, error: err});
      }

      Files.remove({_id: file._id})
        .exec(function (_err, _result) {
          return res.json({success: !_err, data: _result, error: _err});
        });
    })
  });
};
