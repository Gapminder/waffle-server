import * as hi from 'highland';
import * as fetch from 'node-fetch';
import { config } from '../ws.config/config';
import { logger } from '../ws.config/log';
import * as ddfImportUtils from './../ws.import/utils/import-ddf.utils';
import {RecentDdfqlQueriesRepository} from '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';

export {
  warmUpCache
};

function warmUpCache(done: Function): void {
  logger.debug(config, 'Config for warm up cache');

  let warmedQueriesAmount = 0;
  const recentDdfqlQueries = hi(RecentDdfqlQueriesRepository.findAllAsStream());

  const cacheWarmUpStream = hi([recentDdfqlQueries])
    .merge()
    .through(executeDdfql)
    .tap((queryRaw: any) => {
      warmedQueriesAmount++;
      logger.info(`Warm cache up using DDFQL query: `, queryRaw);
    });

  return ddfImportUtils.startStreamProcessing(cacheWarmUpStream, null, (error: string) => {
    return done(error, warmedQueriesAmount);
  });
}

function executeDdfql(s: any): any {
  return s.flatMap((logRecord: any) => {
    const queryStartTime = Date.now();

    const HOST = `http://localhost:${config.PORT}`;
    const url = `${HOST}/api/ddf/ql/?${logRecord.type === 'URLON' ? logRecord.queryRaw : 'query=' + logRecord.queryRaw}`;

    logger.debug('Cache is going to be warmed up from url: ', url);

    return hi(fetch(url, { method: config.METHOD || 'HEAD' })
      .then(() => {
        return {
          queryRaw: logRecord.queryRaw,
          timeSpentInMillis: Date.now() - queryStartTime
        };
      }));
  });
}
