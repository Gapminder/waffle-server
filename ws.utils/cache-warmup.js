'use strict';

const _ = require('lodash');
const hi = require('highland');
const path = require('path');
const fetch = require('node-fetch');
const logger = require('./../ws.config/log');
const config = require('./../ws.config/config');
const ddfImportUtils = require('./../ws.import/utils/import-ddf.utils');

const recentDdfqlQueriesRepository = require('../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository');

module.exports = {
  warmUpCache
};

function warmUpCache(done) {
  let warmedQueriesAmount = 0;
  const cacheWarmUpStream = hi(recentDdfqlQueriesRepository.findAllAsStream())
    .map(logRecord => hi(executeDdfql(logRecord)))
    .sequence()
    .tap(({queryRaw, status, success}) => {
      if (success !== false) {
        warmedQueriesAmount++;
      }

      logger.info(`Cache warm up attempt. Status:  ${status}. Success: ${success}. DDFQL raw: `, queryRaw);
    });

  return ddfImportUtils.startStreamProcessing(cacheWarmUpStream, null, error => done(error, warmedQueriesAmount));
}

function executeDdfql(logRecord) {
  const url = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?${logRecord.type === 'URLON' ? logRecord.queryRaw : 'query=' + logRecord.queryRaw}`;
  logger.debug('Cache is going to be warmed up from url: ', url);

  return fetch(url)
    .then(response => response.json())
    .then(response => {
      return {
        queryRaw: logRecord.queryRaw,
        success: response.success,
        status: response.error || response.message
      };
    });
}
