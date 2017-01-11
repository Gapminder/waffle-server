'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const RecentDdfqlQueries = mongoose.model('RecentDdfqlQueries');

function RecentDdfqlQueriesRepository() {
}

RecentDdfqlQueriesRepository.prototype.findAllAsStream = function () {
  return RecentDdfqlQueries.find().cursor();
};

RecentDdfqlQueriesRepository.prototype.create = function (query, done) {
  return RecentDdfqlQueries.findOneAndUpdate({queryRaw: query.queryRaw}, query, {upsert: true}, done);
};

module.exports = new RecentDdfqlQueriesRepository();
