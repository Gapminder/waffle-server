import { model } from 'mongoose';

const RecentDdfqlQueries = model('RecentDdfqlQueries');

function RecentDdfqlQueriesRepository() {
}

RecentDdfqlQueriesRepository.prototype.findAllAsStream = function () {
  return RecentDdfqlQueries.find().cursor();
};

RecentDdfqlQueriesRepository.prototype.create = function (query, done) {
  return RecentDdfqlQueries.findOneAndUpdate({queryRaw: query.queryRaw}, query, {upsert: true}, done);
};

const repository = new RecentDdfqlQueriesRepository();

export {repository as RecentDdfqlQueriesRepository};
