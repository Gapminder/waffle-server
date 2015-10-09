var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

var ensureAuthenticated = require('../utils').ensureAuthenticated;

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var Files = mongoose.model('Files');
  app.get('/api/files', ensureAuthenticated, function (req, res) {
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
};
