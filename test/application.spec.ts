import { expect } from 'chai';
import * as sinon from 'sinon';
import { Application } from '../application';

import * as Config from '../ws.config';
import * as Routes from '../ws.routes';
import { logger } from '../ws.config/log';

let sandbox = sinon.createSandbox();

describe('Application', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('starts application successfully', function (): any {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');

    const importDdfReposStub = sandbox.stub();
    const makeDefaultUserStub = sandbox.stub();
    const warmUpCacheStub = sandbox.stub();
    const longRunningQueriesKillerStub = sandbox.stub();
    const listenStub = sandbox.stub();
    const infoStub = sandbox.stub(logger, 'info');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importService') {
          return {
            importDdfRepos: importDdfReposStub.resolves()
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
          PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().then(() => {
      sinon.assert.callOrder(
        makeDefaultUserStub,
        listenStub,
        importDdfReposStub,
        warmUpCacheStub,
        longRunningQueriesKillerStub
      );

      sinon.assert.calledWith(infoStub, `Attempt to warm up the cache is has been completed. Amount of executed queries: 10`);
      sinon.assert.calledWith(listenStub, 8888);
    });
  });

  it('does not warm up cache when not in the THRESHING_MACHINE mode', function (): any {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');

    const importDdfReposStub = sandbox.stub();
    const makeDefaultUserStub = sandbox.stub();
    const warmUpCacheStub = sandbox.stub();
    const longRunningQueriesKillerStub = sandbox.stub();
    const listenStub = sandbox.stub();

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importService') {
          return {
            importDdfRepos: importDdfReposStub.resolves()
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
          PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().then(() => {
      sinon.assert.callOrder(
        makeDefaultUserStub,
        listenStub,
        importDdfReposStub,
        warmUpCacheStub,
        longRunningQueriesKillerStub
      );

      sinon.assert.calledOnce(warmUpCacheStub);
      sinon.assert.calledWithExactly(warmUpCacheStub, sinon.match.func);
    });
  });

  it('logs error when warmup failed', function (): any {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');

    const importDdfReposStub = sandbox.stub();
    const makeDefaultUserStub = sandbox.stub();
    const warmUpCacheStub = sandbox.stub();
    const longRunningQueriesKillerStub = sandbox.stub();
    const listenStub = sandbox.stub();
    const errorStub = sandbox.stub(logger, 'error');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importService') {
          return {
            importDdfRepos: importDdfReposStub.resolves()
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
          PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().then(() => {
      sinon.assert.callOrder(
        makeDefaultUserStub,
        listenStub,
        importDdfReposStub,
        warmUpCacheStub,
        longRunningQueriesKillerStub
      );

      sinon.assert.calledWith(errorStub, 'Boom!', 'Cache warm up failed.');
      sinon.assert.calledOnce(warmUpCacheStub);
    });
  });

  it('fails startup when query killer was not started properly', function (): any {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');

    const importDdfReposStub = sandbox.stub();
    const makeDefaultUserStub = sandbox.stub();
    const warmUpCacheStub = sandbox.stub();
    const longRunningQueriesKillerStub = sandbox.stub();
    const listenStub = sandbox.stub();

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'importService') {
          return {
            importDdfRepos: importDdfReposStub.resolves()
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
          PORT: 8888,
          NODE_ENV: 'development'
        };
      }
    };

    const application = new Application(serviceLocator);

    return application.run().catch((error: any) => {
      sinon.assert.callOrder(
        makeDefaultUserStub,
        listenStub,
        importDdfReposStub,
        warmUpCacheStub,
        longRunningQueriesKillerStub
      );

      expect(error).to.equal('Long running queries killer failed to start');
    });
  });
});
