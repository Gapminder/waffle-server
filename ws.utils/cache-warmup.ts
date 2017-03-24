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
    .map((logRecord: any) => {
      return hi(executeDdfql(logRecord));
    })
    .sequence()
    .tap(({queryRaw, status, success}: any) => {
      if (success !== false) {
        warmedQueriesAmount++;
      }

      logger.info(`Cache warm up attempt. Status:  ${status}. Success: ${success}. DDFQL raw: `, queryRaw);
    });

  return ddfImportUtils.startStreamProcessing(cacheWarmUpStream, null, (error: any) => done(error, warmedQueriesAmount));
}

function executeDdfql(logRecord: any): any {
  const url = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?${logRecord.type === 'URLON' ? logRecord.queryRaw : 'query=' + logRecord.queryRaw}`;
  logger.debug('Cache is going to be warmed up from url: ', url);

  return fetch(url)
    .then((response: any) => {
      return response.json();
    })
    .then((response: any) => {
      return {
        queryRaw: logRecord.queryRaw,
        success: response.success,
        status: response.error || response.message
      };
    });
}
