import { model } from 'mongoose';

const RecentDdfqlQueries = model('RecentDdfqlQueries');

/* tslint:disable-next-line:no-empty */
function RecentDdfqlQueriesRepository(): void {
}

RecentDdfqlQueriesRepository.prototype.findAllAsStream = function (): any {
  return RecentDdfqlQueries.find().cursor();
};

RecentDdfqlQueriesRepository.prototype.create = function (query: any, done: any): any {
  return RecentDdfqlQueries.findOneAndUpdate({queryRaw: query.queryRaw}, query, {upsert: true}, done);
};

const repository = new RecentDdfqlQueriesRepository();

export {repository as RecentDdfqlQueriesRepository};
