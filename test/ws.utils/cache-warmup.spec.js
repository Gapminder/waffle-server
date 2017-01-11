'use strict';

require('../../ws.repository');
const config = require('../../ws.config/config');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('chai').expect;

const recentDdfqlQueriesRepositoryPath = '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';
const loggerPath = './../ws.config/log';
const fetchPath = 'node-fetch';

describe('Cache Warm up', () => {
  it('should warm up cache using URLON stringified ddfql query', done => {
    const queryResponse = {
      success: true,
      message: 'Completed !:)'
    };

    const recentQuery = {
      queryRaw: "_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en",
      type: "URLON",
    };

    const expectedUrl = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en`;

    const warmUp = proxyquire('../../ws.utils/cache-warmup.js', {
      [recentDdfqlQueriesRepositoryPath]: {
        findAllAsStream: () => {
          return [recentQuery];
        }
      },
      [fetchPath]: url => {
        expect(url).to.equal(expectedUrl);
        return Promise.resolve({
          json: () => Promise.resolve(queryResponse)
        });
      },
      [loggerPath]: {
        info: (... messages) => {
          expect(messages).to.have.lengthOf(2);
          expect(messages[0]).to.equal(`Cache warm up attempt. Status:  ${queryResponse.message}. Success: ${queryResponse.success}. DDFQL raw: `);
          expect(messages[1]).to.equal(recentQuery.queryRaw);
        },
        debug: (... messages) => {
          expect(messages).to.have.lengthOf(2);
          expect(messages[0]).to.equal('Cache is going to be warmed up from url: ');
          expect(messages[1]).to.equal(expectedUrl);
        }
      }
    });

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(1);
      done();
    });
  });

  it('should warm up cache using JSON stringified ddfql query', done => {
    const queryResponse = {
      success: true,
      message: 'Completed !:)'
    };

    const recentQuery = {
      queryRaw: '{"language":"en","from":"entities","animatable":false,"select":{"key":["geo"],"value":["name","rank","shape_lores_svg"]},"where":{},"join":{},"order_by":["rank"]}',
      type: "JSON",
    };

    const expectedUrl = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?query={"language":"en","from":"entities","animatable":false,"select":{"key":["geo"],"value":["name","rank","shape_lores_svg"]},"where":{},"join":{},"order_by":["rank"]}`;

    const warmUp = proxyquire('../../ws.utils/cache-warmup.js', {
      [recentDdfqlQueriesRepositoryPath]: {
        findAllAsStream: () => {
          return [recentQuery];
        }
      },
      [fetchPath]: url => {
        expect(url).to.equal(expectedUrl);
        return Promise.resolve({
          json: () => Promise.resolve(queryResponse)
        });
      },
      [loggerPath]: {
        info: (... messages) => {
          expect(messages).to.have.lengthOf(2);
          expect(messages[0]).to.equal(`Cache warm up attempt. Status:  ${queryResponse.message}. Success: ${queryResponse.success}. DDFQL raw: `);
          expect(messages[1]).to.equal(recentQuery.queryRaw);
        },
        debug: (... messages) => {
          expect(messages).to.have.lengthOf(2);
          expect(messages[0]).to.equal('Cache is going to be warmed up from url: ');
          expect(messages[1]).to.equal(expectedUrl);
        }
      }
    });

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(1);
      done();
    });
  });

  it('should generate an error when warm up request was unsuccessful', done => {
    const recentQuery = {
      queryRaw: "_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en",
      type: "URLON",
    };

    const warmUp = proxyquire('../../ws.utils/cache-warmup.js', {
      [recentDdfqlQueriesRepositoryPath]: {
        findAllAsStream: () => {
          return [recentQuery];
        }
      },
      [fetchPath]: () => {
        return Promise.reject('Boom!');
      }
    });

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.have.lengthOf(1);
      expect(error[0]).to.equal('Boom!');
      expect(warmedQueriesAmount).to.equal(warmedQueriesAmount);
      done();
    });
  });

  it('should not warm up cache when recent queries are absent', done => {
    const fetchFunc = sinon.spy();

    const warmUp = proxyquire('../../ws.utils/cache-warmup.js', {
      [recentDdfqlQueriesRepositoryPath]: {
        findAllAsStream: () => []
      },
      [fetchPath]: fetchFunc
    });

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(0);
      expect(fetchFunc.callCount).to.equal(0);
      done();
    });
  });
});
