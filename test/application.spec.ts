import { expect } from 'chai';
import * as sinon from 'sinon';
import { Application } from '../application';

import * as Config from '../ws.config';
import * as Routes from '../ws.routes';
import { logger } from '../ws.config/log';
import * as ddfqlController from '../ws.routes/ddfql/ddfql.controller';
import { importService } from '../ws.services/import/import.service';


let sandbox = sinon.createSandbox();

describe('Application', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('starts application successfully', async function (): Promise<void> {
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');

    const listenStub = sandbox.stub();
    const loggerStub = sandbox.stub(logger, 'info');
    const importServiceStub = sandbox.stub(importService, 'importByConfig');

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub } }),
      set: sandbox.stub(),
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
      await application.importDatasets();
    } catch (error) {
      throw new Error(`This should never be called. ${error}`);
    }

    sinon.assert.calledOnce(listenStub);
    sinon.assert.calledWithExactly(listenStub, 8888);
    sinon.assert.calledOnce(importServiceStub);
    sinon.assert.calledWithExactly(importServiceStub);
    sinon.assert.calledOnce(loggerStub);
    sinon.assert.calledWithExactly(loggerStub, `Express server listening on port 8888 in development mode`);
  });

  it('logs error when mongoless import failed', async function (): Promise<void> {
    let actualError;
    sandbox.stub(Config, 'configureWaffleServer');
    sandbox.stub(Routes, 'registerRoutes');
    const expectedError = 'Boom!';

    const listenStub = sandbox.stub();
    const loggerStub = sandbox.stub(logger, 'error');
    const importServiceStub = sandbox.stub(importService, 'importByConfig').throwsException(expectedError);

    const serviceLocator: any = {
      getApplication: () => ({ listen: { bind: () => listenStub } }),
      set: sandbox.stub(),
      get: (serviceName: string) => {
        if (serviceName === 'config') {
          return {
            PORT: 3333,
            NODE_ENV: 'development',
            IS_TESTING: true
          };
        }

        throw new Error(`No registered module '${serviceName}' in application`);
      }
    };

    const application = new Application(serviceLocator);

    try {
      await application.run();
      application.importDatasets();

      throw new Error('This should never be called');
    } catch (error) {
      actualError = error;
    }
    expect(actualError).to.be.an('error');
    expect(actualError.toString()).to.equal(expectedError);
    expect(actualError.toString()).to.not.equal('This should never be called');

    sinon.assert.calledOnce(listenStub);
    sinon.assert.calledWithExactly(listenStub, 3333);
    sinon.assert.calledOnce(importServiceStub);
    sinon.assert.calledWithExactly(importServiceStub);
    sinon.assert.calledOnce(loggerStub);
  });
});
