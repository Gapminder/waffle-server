import * as hi from 'highland';
import * as fetch from 'node-fetch';
import { logger } from '../ws.config/log';
import { config } from '../ws.config/config';
import * as ddfImportUtils from './../ws.import/utils/import-ddf.utils';

import { RecentDdfqlQueriesRepository } from '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';

export {
  warmUpCache
};

function warmUpCache(done: Function): void {
  let warmedQueriesAmount = 0;
  const cacheWarmUpStream = hi(RecentDdfqlQueriesRepository.findAllAsStream())
    .through(executeDdfql)
    .tap((queryRaw: any) => {
      warmedQueriesAmount++;
      logger.info(`Warm cache up using DDFQL query: `, queryRaw);
    });

  return ddfImportUtils.startStreamProcessing(cacheWarmUpStream, null, (error: string) => done(error, warmedQueriesAmount));
}

function executeDdfql(s: any): any {
  return s.flatMap((logRecord: any) => {
    const url = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?${logRecord.type === 'URLON' ? logRecord.queryRaw : 'query=' + logRecord.queryRaw}`;
    logger.debug('Cache is going to be warmed up from url: ', url);
    return hi(fetch(url, {method: 'HEAD'}).then(() => ({queryRaw: logRecord.queryRaw})));
  });
}
