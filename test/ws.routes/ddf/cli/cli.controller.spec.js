'use strict';

const proxyqire = require('proxyquire');
const expect = require('chai').expect;
const sinon = require('sinon');

require('../../../../ws.repository');
const logger = require('../../../../ws.config/log');
const routeUtils = require('../../../../ws.routes/utils');

const cliServicePath = './../../../ws.services/cli.service';

describe('WS-CLI controller', () => {
  it('should respond with an error when error happened during import and server didn\'t send response yet', sinon.test(function (done) {
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
    const expectedError = {message: 'Boo!'};
    const expectedResponse = {success: false, error: 'Boo!'};

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        importDataset: (params, onImported) => {
          onImported(expectedError);
        }
      },
    });

    const req = {
      body: {}
    };

    const res = {
      headersSent: false,
      json: response => {
        expect(response).to.deep.equal(expectedResponse);
        expect(toErrorResponseSpy.withArgs(expectedError).calledOnce).to.be.true;
        done();
      }
    };

    cliController.importDataset(req, res);
  }));

  it('should log an error when it occurred during import and server did send response already', sinon.test(function (done) {
    const loggerSpy = this.spy(logger, 'error');
    const expectedError = {message: 'Boo!'};

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        importDataset: (params, onImported) => {
          onImported(expectedError);

          expect(loggerSpy.withArgs(expectedError).calledOnce).to.be.true;
          done();
        }
      },
    });

    const req = {
      body: {}
    };

    const res = {
      headersSent: true,
      json: () => {
        throw new Error('This should not be called');
      }
    };

    cliController.importDataset(req, res);
  }));

  it('should log that import succeeded', sinon.test(function (done) {
    const loggerSpy = this.spy(logger, 'info');

    const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';
    const commit = '8744022391f4c6518b0d070e3b85ff12b7884dd2';

    const expectedMessage = `finished import for dataset '${github}' and commit '${commit}'`;

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        importDataset: (params, onImported) => {
          onImported();

          expect(params).to.include.keys('github', 'commit', 'lifecycleHooks');
          expect(params.github).to.equal(github);
          expect(params.commit).to.equal(commit);

          expect(params.lifecycleHooks).to.include.keys('onTransactionCreated');
          expect(params.lifecycleHooks.onTransactionCreated).to.be.instanceof(Function);

          expect(loggerSpy.withArgs(expectedMessage).calledOnce).to.be.true;

          done();
        }
      },
    });

    const req = {
      body: {
        github,
        commit
      }
    };

    const res = {
      json: () => {
        throw new Error('This should not be called');
      }
    };

    cliController.importDataset(req, res);
  }));

  it('should release connection once transaction was created for import process', sinon.test(function(done) {
    const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
    const expectedMessage = 'Dataset importing is in progress ...';
    const expectedResponse = {success: true, message: expectedMessage};

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        importDataset: params => {
          params.lifecycleHooks.onTransactionCreated();
        }
      },
    });

    const req = {
      body: {}
    };

    const res = {
      headersSent: false,
      json: response => {
        expect(response).to.deep.equal(expectedResponse);
        expect(toMessageResponseSpy.withArgs(expectedMessage).calledOnce).to.be.true;
        done();
      }
    };

    cliController.importDataset(req, res);
  }));

  it('should do nothing if respose was already sent and transaction was created after', sinon.test(function (done) {
    const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        importDataset: params => {
          params.lifecycleHooks.onTransactionCreated();
          sinon.assert.notCalled(toMessageResponseSpy);
          done();
        }
      },
    });

    const req = {
      body: {}
    };

    const res = {
      headersSent: true,
      json: () => {
        throw Error('This should not be called');
      }
    };

    cliController.importDataset(req, res);
  }));
});
