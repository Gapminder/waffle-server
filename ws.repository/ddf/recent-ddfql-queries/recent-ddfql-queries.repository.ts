import { model } from 'mongoose';

const RecentDdfqlQueries = model('RecentDdfqlQueries');

/* tslint:disable-next-line:no-empty */
function RecentDdfqlQueriesRepository(): void {
}

RecentDdfqlQueriesRepository.prototype.findAllAsStream = function (): any {
  return RecentDdfqlQueries.find().cursor();
};

RecentDdfqlQueriesRepository.prototype.create = function (query: any, done: Function): any {
  return RecentDdfqlQueries.findOneAndUpdate({queryRaw: query.queryRaw}, query, {upsert: true}, done as any);
};

const repository = new RecentDdfqlQueriesRepository();

export {repository as RecentDdfqlQueriesRepository};
