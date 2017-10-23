import { model } from 'mongoose';
import { logger } from '../../../ws.config/log';

const RecentDdfqlQueries = model('RecentDdfqlQueries');

/* tslint:disable-next-line:no-empty */
function RecentDdfqlQueriesRepository(): void {
}

RecentDdfqlQueriesRepository.prototype.findAllAsStream = function (): any {
  return RecentDdfqlQueries.find().cursor();
};

RecentDdfqlQueriesRepository.prototype.create = function (query: any, done: (err: any) => void): any {
  return RecentDdfqlQueries.findOne({queryRaw: query.queryRaw})
    .lean()
    .exec((error: string, recentDdfqlQuery: any) => {
    if (error) {
      return done(error);
    }

    if (recentDdfqlQuery) {
      if (recentDdfqlQuery.docsAmount !== query.docsAmount) {
        logger.error({obj: {previousResult: recentDdfqlQuery, currentResult: query}}, 'RecentDdfqlQueriesRepository: TOO BAD! Documents amounts aren\'t equal');
      }

      if ((recentDdfqlQuery.timeSpentInMillis * 1.2) < query.timeSpentInMillis) {
        logger.error({obj: {previousResult: recentDdfqlQuery, currentResult: query}}, 'RecentDdfqlQueriesRepository: TOO BAD! Spent time is too high');
      }

      if (recentDdfqlQuery.timeSpentInMillis * 0.8 > query.timeSpentInMillis) {
        logger.warn({obj: {previousResult: recentDdfqlQuery, currentResult: query}}, 'RecentDdfqlQueriesRepository: GREAT JOB!!!');
      }
    }

    RecentDdfqlQueries.update({queryRaw: query.queryRaw}, query, {upsert: true}, done);
  });
};

const repository = new RecentDdfqlQueriesRepository();

export {repository as RecentDdfqlQueriesRepository};
