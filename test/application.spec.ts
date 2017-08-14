import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { Application } from '../application';

import * as Config from '../ws.config';
import * as Routes from '../ws.routes';
import { logger } from '../ws.config/log';

const sandbox = sinonTest.configureTest(sinon);

describe('Application', () => {
  it('starts application successfully', sandbox(function (): any {
    this.stub(Config, 'configureWaffleServer');
    this.stub(Routes, 'registerRoutes');

    const cloneImportedDdfReposStub = this.stub();
    const makeDefaultUserStub = this.stub();
    const warmUpCacheStub = this.stub();
    const longRunningQueriesKillerStub = this.stub();
    const listenStub = this.stub();
    const infoStub = this.stub(logger, 'info');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importUtils') {
          return {
            cloneImportedDdfRepos: cloneImportedDdfReposStub.resolves()
          };
        }

        if (serviceName === 'warmupUtils') {
          return {
            warmUpCache: warmUpCacheStub.callsArgWithAsync(0, null, 10)
          };
        }

        if (serviceName === 'usersService') {
          return { makeDefaultUser: makeDefaultUserStub.resolves() };
        }

        if (serviceName === 'longRunningQueriesKiller') {
          return { start: longRunningQueriesKillerStub, running: true };
        }

        return {
          THRASHING_MACHINE: true,
          INNER_PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().then(() => {
      sinon.assert.callOrder(
        cloneImportedDdfReposStub,
        listenStub,
        makeDefaultUserStub,
        warmUpCacheStub,
        longRunningQueriesKillerStub
      );

      sinon.assert.calledWith(infoStub, `Attempt to warm up the cache is has been completed. Amount of executed queries: 10`);
      sinon.assert.calledWith(listenStub, 8888);
    });
  }));

  it('does not warm up cache when not in the THRESHING_MACHINE mode', sandbox(function (): any {
    this.stub(Config, 'configureWaffleServer');
    this.stub(Routes, 'registerRoutes');

    const cloneImportedDdfReposStub = this.stub();
    const makeDefaultUserStub = this.stub();
    const warmUpCacheStub = this.stub();
    const longRunningQueriesKillerStub = this.stub();
    const listenStub = this.stub();

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importUtils') {
          return {
            cloneImportedDdfRepos: cloneImportedDdfReposStub.resolves()
          };
        }

        if (serviceName === 'warmupUtils') {
          return {
            warmUpCache: warmUpCacheStub.callsArgWithAsync(0, null)
          };
        }

        if (serviceName === 'usersService') {
          return { makeDefaultUser: makeDefaultUserStub.resolves() };
        }

        if (serviceName === 'longRunningQueriesKiller') {
          return { start: longRunningQueriesKillerStub, running: true };
        }

        return {
          THRASHING_MACHINE: false,
          INNER_PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().then(() => {
      sinon.assert.callOrder(
        cloneImportedDdfReposStub,
        listenStub,
        makeDefaultUserStub,
        longRunningQueriesKillerStub
      );

      sinon.assert.notCalled(warmUpCacheStub);
    });
  }));

  it('logs error when warmup failed', sandbox(function (): any {
    this.stub(Config, 'configureWaffleServer');
    this.stub(Routes, 'registerRoutes');

    const cloneImportedDdfReposStub = this.stub();
    const makeDefaultUserStub = this.stub();
    const warmUpCacheStub = this.stub();
    const longRunningQueriesKillerStub = this.stub();
    const listenStub = this.stub();
    const errorStub = this.stub(logger, 'error');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importUtils') {
          return {
            cloneImportedDdfRepos: cloneImportedDdfReposStub.resolves()
          };
        }

        if (serviceName === 'warmupUtils') {
          return {
            warmUpCache: warmUpCacheStub.callsArgWithAsync(0, 'Boom!')
          };
        }

        if (serviceName === 'usersService') {
          return { makeDefaultUser: makeDefaultUserStub.resolves() };
        }

        if (serviceName === 'longRunningQueriesKiller') {
          return { start: longRunningQueriesKillerStub, running: true };
        }

        return {
          THRASHING_MACHINE: true,
          INNER_PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().then(() => {
      sinon.assert.callOrder(
        cloneImportedDdfReposStub,
        listenStub,
        makeDefaultUserStub,
        longRunningQueriesKillerStub
      );

      sinon.assert.calledWith(errorStub, 'Boom!', 'Cache warm up failed.');
      sinon.assert.calledOnce(warmUpCacheStub);
    });
  }));

  it('fails startup when query killer was not started properly', sandbox(function (): any {
    this.stub(Config, 'configureWaffleServer');
    this.stub(Routes, 'registerRoutes');

    const cloneImportedDdfReposStub = this.stub();
    const makeDefaultUserStub = this.stub();
    const warmUpCacheStub = this.stub();
    const longRunningQueriesKillerStub = this.stub();
    const listenStub = this.stub();

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importUtils') {
          return {
            cloneImportedDdfRepos: cloneImportedDdfReposStub.resolves()
          };
        }

        if (serviceName === 'warmupUtils') {
          return {
            warmUpCache: warmUpCacheStub.callsArgWithAsync(0, 'Boom!')
          };
        }

        if (serviceName === 'usersService') {
          return { makeDefaultUser: makeDefaultUserStub.resolves() };
        }

        if (serviceName === 'longRunningQueriesKiller') {
          return { start: longRunningQueriesKillerStub, running: false };
        }

        return {
          THRASHING_MACHINE: true,
          INNER_PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().catch((error: any) => {
      expect(error).to.equal('Long running queries killer failed to start');
    });
  }));
});
