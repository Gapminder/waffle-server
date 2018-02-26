import { expect } from 'chai';
import * as sinon from 'sinon';
import * as proxyquire from 'proxyquire';

import { logger } from '../../ws.config/log';

import '../../ws.repository';
import '../../ws.config/db.config';

import { config } from '../../ws.config/config';

const sandbox = sinon.createSandbox();
const recentDdfqlQueriesRepositoryPath = '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';
const loggerPath = './../ws.config/log';
const fetchPath = 'node-fetch';

describe('Cache Warm up', () => {

  afterEach(() => sandbox.restore());

  it('should warm up cache using URLON stringified ddfql query', function (done: Function): void {
    const queryResponse = {
      success: true,
      message: 'Completed !:)'
    };

    const recentQuery = {
      queryRaw: '_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en',
      type: 'URLON'
    };

    const expectedUrl = `http://localhost:${config.PORT}/api/ddf/ql/?_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en`;

    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerDebugStub = sandbox.stub(logger, 'debug');

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
      [recentDdfqlQueriesRepositoryPath]: {
        RecentDdfqlQueriesRepository: {
          findAllAsStream: () => {
            return [recentQuery];
          }
        }
      },
      [fetchPath]: (url: string, options: any) => {
        expect(options.method).to.equal('HEAD');
        return {
          then: () => [recentQuery.queryRaw]
        };
      }
    });

    warmUp.warmUpCache((error: string, warmedQueriesAmount: number) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(1);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.alwaysCalledWithExactly(loggerInfoStub, `Warm cache up using DDFQL query: `, recentQuery.queryRaw);

      sinon.assert.calledTwice(loggerDebugStub);
      sinon.assert.calledWithExactly(loggerDebugStub, sinon.match.object, 'Config for warm up cache');
      sinon.assert.calledWithExactly(loggerDebugStub, 'Cache is going to be warmed up from url: ', expectedUrl);

      done();
    });
  });

  it('should warm up cache using JSON stringified ddfql query', function (done: Function): void {
    const queryResponse = {
      success: true,
      message: 'Completed! :)'
    };

    const recentQuery = {
      queryRaw: '{"language":"en","from":"entities","animatable":false,"select":{"key":["geo"],"value":["name","rank","shape_lores_svg"]},"where":{},"join":{},"order_by":["rank"]}',
      type: 'JSON'
    };

    const expectedUrl = `http://localhost:${config.PORT}/api/ddf/ql/?query={"language":"en","from":"entities","animatable":false,"select":{"key":["geo"],"value":["name","rank","shape_lores_svg"]},"where":{},"join":{},"order_by":["rank"]}`;

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
      [recentDdfqlQueriesRepositoryPath]: {
        RecentDdfqlQueriesRepository: {
          findAllAsStream: () => {
            return [recentQuery];
          }
        }
      },
      [fetchPath]: (url) => {
        expect(url).to.equal(expectedUrl);
        return {
          then: () => [recentQuery.queryRaw]
        };
      }
    });

    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerDebugStub = sandbox.stub(logger, 'debug');

    warmUp.warmUpCache((error: string, warmedQueriesAmount: number) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(1);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Warm cache up using DDFQL query: `, recentQuery.queryRaw);

      sinon.assert.calledTwice(loggerDebugStub);
      sinon.assert.calledWithExactly(loggerDebugStub, sinon.match.object, 'Config for warm up cache');
      sinon.assert.calledWithExactly(loggerDebugStub, 'Cache is going to be warmed up from url: ', expectedUrl);

      done();
    });
  });

  it('should generate an error when warm up request was unsuccessful', function (done: Function): void {
    const recentQuery = {
      queryRaw: '_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en',
      type: 'URLON'
    };

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
      [recentDdfqlQueriesRepositoryPath]: {
        RecentDdfqlQueriesRepository: {
          findAllAsStream: () => {
            return [recentQuery];
          }
        }
      },
      [fetchPath]: () => {
        return {
          then: () => {
            throw 'Boom!';
          }
        };
      }
    });

    warmUp.warmUpCache((error: string, warmedQueriesAmount: number) => {
      expect(error).to.have.lengthOf(1);
      expect(error[0]).to.equal('Boom!');
      expect(warmedQueriesAmount).to.equal(warmedQueriesAmount);
      done();
    });
  });

  it('should not warm up cache when recent queries are absent', function (done: Function): void {
    const fetchFunc = sandbox.stub();

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
      [recentDdfqlQueriesRepositoryPath]: {
        RecentDdfqlQueriesRepository: {
          findAllAsStream: () => []
        }
      },
      [fetchPath]: fetchFunc
    });

    warmUp.warmUpCache((error: string, warmedQueriesAmount: number) => {
      expect(error).to.not.exist;

      expect(fetchFunc.callCount).to.equal(0);
      expect(warmedQueriesAmount).to.equal(0);

      done();
    });
  });
});
