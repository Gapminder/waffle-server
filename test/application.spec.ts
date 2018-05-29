import { expect } from 'chai';
import * as sinon from 'sinon';
import { Application } from '../application';

import * as Config from '../ws.config';
import * as Routes from '../ws.routes';
import { logger } from '../ws.config/log';
import * as ddfqlController from '../ws.routes/ddfql/ddfql.controller';

let sandbox = sinon.createSandbox();

describe('Application', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('starts application successfully', async function (): Promise<void> {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');

    const mongolessImportStub = sandbox.stub(ddfqlController, 'mongolessImport');
    const listenStub = sandbox.stub();
    const loggerStub = sandbox.stub(logger, 'info');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'config') {
          return {
            PORT: 8888,
            NODE_ENV: 'development'
          };
        }

        throw new Error(`No registered module '${serviceName}' in application`);
      }
    };

    const application = new Application(serviceLocator);

    try {
      await application.run();

      sinon.assert.calledOnce(listenStub);
      sinon.assert.calledWithExactly(listenStub, 8888, sinon.match.func);
      sinon.assert.calledOnce(mongolessImportStub);
      sinon.assert.calledWithExactly(mongolessImportStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, `Express server listening on port 8888 in development mode`);
    } catch (error) {
      throw new Error(`This should never be called. ${error}`);
    }
  });

  it('logs error when mongoless import failed', async function (): Promise<void> {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');
    const expectedError = 'Boom!';
    const mongolessImportStub = sandbox.stub(ddfqlController, 'mongolessImport').throwsException(expectedError);

    const listenStub = sandbox.stub();
    const loggerStub = sandbox.stub(logger, 'error');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub.callsArgWithAsync(1) } }),
      get: (serviceName: string) => {
        if (serviceName === 'config') {
          return {
            PORT: 3333,
            NODE_ENV: 'development'
          };
        }

        throw new Error(`No registered module '${serviceName}' in application`);
      }
    };

    const application = new Application(serviceLocator);

    try {
      await application.run();
      throw new Error('This should never be called');
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.toString()).to.equal(expectedError);
      expect(error.toString()).to.not.equal('This should never be called');
      sinon.assert.calledOnce(listenStub);
      sinon.assert.calledWithExactly(listenStub, 3333, sinon.match.func);
      sinon.assert.calledOnce(mongolessImportStub);
      sinon.assert.calledWithExactly(mongolessImportStub);
      sinon.assert.notCalled(loggerStub);
    }
  });
});
