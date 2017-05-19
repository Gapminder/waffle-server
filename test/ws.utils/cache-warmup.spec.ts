import {expect} from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import * as proxyquire from 'proxyquire';

import { logger } from '../../ws.config/log';

import '../../ws.repository';
import '../../ws.config/db.config';

import {config} from '../../ws.config/config';

const sandbox = sinonTest.configureTest(sinon);
const recentDdfqlQueriesRepositoryPath = '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';
const loggerPath = './../ws.config/log';
const fetchPath = 'node-fetch';

describe('Cache Warm up', () => {
  it('should warm up cache using URLON stringified ddfql query', sandbox(function(done: Function) {
    const queryResponse = {
      success: true,
      message: 'Completed !:)'
    };

    const recentQuery = {
      queryRaw: "_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en",
      type: "URLON",
    };

    const expectedUrl = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en`;

    const loggerInfoStub = this.stub(logger, 'info');
    const loggerDebugStub = this.stub(logger, 'debug');

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
      [recentDdfqlQueriesRepositoryPath]: {
        RecentDdfqlQueriesRepository: {
          findAllAsStream: () => {
            return [recentQuery];
          }
        }
      },
      [fetchPath]: url => {
        expect(url).to.equal(expectedUrl);
        return Promise.resolve({
          json: () => Promise.resolve(queryResponse)
        });
      }
    });

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(1);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Cache warm up attempt. Status:  ${queryResponse.message}. Success: ${queryResponse.success}. DDFQL raw: `, recentQuery.queryRaw);

      sinon.assert.calledOnce(loggerDebugStub);
      sinon.assert.calledWithExactly(loggerDebugStub, 'Cache is going to be warmed up from url: ', expectedUrl);

      done();
    });
  }));

  it('should warm up cache using JSON stringified ddfql query', sandbox(function(done: Function) {
    const queryResponse = {
      success: true,
      message: 'Completed! :)'
    };

    const recentQuery = {
      queryRaw: '{"language":"en","from":"entities","animatable":false,"select":{"key":["geo"],"value":["name","rank","shape_lores_svg"]},"where":{},"join":{},"order_by":["rank"]}',
      type: "JSON",
    };

    const expectedUrl = `http://localhost:${config.INNER_PORT}/api/ddf/ql/?query={"language":"en","from":"entities","animatable":false,"select":{"key":["geo"],"value":["name","rank","shape_lores_svg"]},"where":{},"join":{},"order_by":["rank"]}`;

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
      [recentDdfqlQueriesRepositoryPath]: {
        RecentDdfqlQueriesRepository: {
          findAllAsStream: () => {
            return [recentQuery];
          }
        }
      },
      [fetchPath]: url => {
        expect(url).to.equal(expectedUrl);
        return Promise.resolve({
          json: () => Promise.resolve(queryResponse)
        });
      }
    });

    const loggerInfoStub = this.stub(logger, 'info');
    const loggerDebugStub = this.stub(logger, 'debug');

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.not.exist;
      expect(warmedQueriesAmount).to.equal(1);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Cache warm up attempt. Status:  ${queryResponse.message}. Success: ${queryResponse.success}. DDFQL raw: `, recentQuery.queryRaw);

      sinon.assert.calledOnce(loggerDebugStub);
      sinon.assert.calledWithExactly(loggerDebugStub, 'Cache is going to be warmed up from url: ', expectedUrl);

      done();
    });
  }));

  it('should generate an error when warm up request was unsuccessful', sandbox(function(done: Function) {
    const recentQuery = {
      queryRaw: "_select_key@=concept;&value@=concept/_type&=domain&=indicator/_url&=color&=scales&=interpolation&=tags&=name&=unit&=description;;&from=concepts&where_;&language=en",
      type: "URLON",
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
        return Promise.reject('Boom!');
      }
    });

    warmUp.warmUpCache((error, warmedQueriesAmount) => {
      expect(error).to.have.lengthOf(1);
      expect(error[0]).to.equal('Boom!');
      expect(warmedQueriesAmount).to.equal(warmedQueriesAmount);
      done();
    });
  }));

  it('should not warm up cache when recent queries are absent', sandbox(function(done: Function) {
    const fetchFunc = sinon.spy();

    const warmUp = proxyquire('../../ws.utils/cache-warmup', {
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
  }));
});
