import '../../../../ws.repository';

import * as proxyqire from 'proxyquire';
import {expect} from 'chai';
import * as sinon from 'sinon';
import {logger} from '../../../../ws.config/log';
import * as routeUtils from '../../../../ws.routes/utils';
import * as datasetsService from '../../../../ws.services/datasets.service';
import * as cliController from '../../../../ws.routes/ddf/cli/cli.controller';

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

  it('should clean cache', sinon.test(function (done) {
    const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
    const expectedMessage = 'Cache is clean';

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        cleanDdfRedisCache: onCleaned => {
          onCleaned(null);
        }
      },
    });

    const req = {
      user: {
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        expect(toMessageResponseSpy.withArgs(expectedMessage).calledOnce).to.be.true;
        done();
      }
    };

    cliController.cleanCache(req, res);
  }));

  it('should not clean cache cause user is not authenticated', sinon.test(function (done) {
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
    const expectedMessage = 'There is no authenticated user to get its datasets';

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        cleanDdfRedisCache: () => {
          throw new Error('This should not be called');
        }
      },
    });

    const req = {};
    const res = {
      json: () => {
        expect(toErrorResponseSpy.withArgs(expectedMessage).calledOnce).to.be.true;
        done();
      }
    };

    cliController.cleanCache(req, res);
  }));

  it('should respond with an error if cache clean failed', sinon.test(function (done) {
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
    const expectedError = 'Boo!';

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        cleanDdfRedisCache: onCleaned => {
          onCleaned(expectedError);
        }
      },
    });

    const req = {
      user: {
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        expect(toErrorResponseSpy.withArgs(expectedError).calledOnce).to.be.true;
        done();
      }
    };

    cliController.cleanCache(req, res);
  }));

  it('should not fetch datasets in progress cause user is not authenticated', sinon.test(function (done) {
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
    const expectedMessage = 'There is no authenticated user to get its datasets';

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        getDatasetsInProgress: () => {
          throw new Error('This should not be called');
        }
      },
    });

    const req = {};
    const res = {
      json: () => {
        expect(toErrorResponseSpy.withArgs(expectedMessage).calledOnce).to.be.true;
        done();
      }
    };

    cliController.getDatasetsInProgress(req, res);
  }));

  it('should fetch datasets that are currently in progress (being deleted, updated or imported)', sinon.test(function (done) {
    const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
    const expectedData = [{
      name: 'dataset.name',
      githubUrl: 'dataset.path'
    }];

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        getDatasetsInProgress: (userId, onFound) => {
          expect(userId).to.equal('fakeId');
          onFound(null, expectedData);
        }
      },
    });

    const req = {
      user: {
        _id: 'fakeId',
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        expect(toDataResponseSpy.withArgs(expectedData).calledOnce).to.be.true;
        done();
      }
    };

    cliController.getDatasetsInProgress(req, res);
  }));

  it('should respond with an error if trying to get datasets in progress got the error', sinon.test(function (done) {
    const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
    const expectedError = 'Boo!';

    const cliController = proxyqire('../../../../ws.routes/ddf/cli/cli.controller', {
      [cliServicePath]: {
        getDatasetsInProgress: (userId, onFound) => {
          onFound(expectedError);
        }
      },
    });

    const req = {
      user: {
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        expect(toErrorResponseSpy.withArgs(expectedError).calledOnce).to.be.true;
        done();
      }
    };

    cliController.getDatasetsInProgress(req, res);

    sinon.assert.notCalled(toDataResponseSpy);
  }));

  it('should fetch removal state of dataset that is being removed', sinon.test(function (done) {
    const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');

    const removalStatus = {
      concepts: 42,
      entities: 42,
      datapoints: 42,
    };

    const getRemovalStateForDatasetStub = this.stub(datasetsService, 'getRemovalStateForDataset');
    getRemovalStateForDatasetStub
      .onFirstCall().callsArgWith(2, null, removalStatus);

    const req = {
      query: {
        datasetName: 'datasetName'
      },
      user: {
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        sinon.assert.notCalled(toErrorResponseSpy);
        sinon.assert.calledOnce(toDataResponseSpy);
        sinon.assert.calledWith(toDataResponseSpy, removalStatus);

        sinon.assert.calledOnce(getRemovalStateForDatasetStub);
        sinon.assert.calledWith(getRemovalStateForDatasetStub, req.query.datasetName, req.user);

        done();
      }
    };

    cliController.getStateOfDatasetRemoval(req, res);
  }));

  it('should respond with an error if smth went wrong during status fetching', sinon.test(function (done) {
    const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');

    const expectedError = 'Boo!';

    const getRemovalStateForDatasetStub = this.stub(datasetsService, 'getRemovalStateForDataset');
    getRemovalStateForDatasetStub
      .onFirstCall().callsArgWith(2, expectedError, null);

    const req = {
      query: {
        datasetName: 'datasetName'
      },
      user: {
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        sinon.assert.notCalled(toDataResponseSpy);
        sinon.assert.calledOnce(toErrorResponseSpy);
        sinon.assert.calledWith(toErrorResponseSpy, expectedError);

        sinon.assert.calledOnce(getRemovalStateForDatasetStub);
        sinon.assert.calledWith(getRemovalStateForDatasetStub, req.query.datasetName, req.user);
        done();
      }
    };

    cliController.getStateOfDatasetRemoval(req, res);
  }));

  it('should respond with an error if dataset name was not provided in request', sinon.test(function (done) {
    const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');

    const expectedError = 'No dataset name was given';

    const req = {
      query: {
      },
      user: {
        name: 'fake'
      }
    };

    const res = {
      json: () => {
        sinon.assert.notCalled(toDataResponseSpy);
        sinon.assert.calledOnce(toErrorResponseSpy);
        sinon.assert.calledWith(toErrorResponseSpy, expectedError);
        done();
      }
    };

    cliController.getStateOfDatasetRemoval(req, res);
  }));

  it('should respond with an error if user is not authenticated', sinon.test(function (done) {
    const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
    const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');

    const expectedError = 'Unauthenticated user cannot perform CLI operations';

    const req = {};

    const res = {
      json: () => {
        sinon.assert.notCalled(toDataResponseSpy);
        sinon.assert.calledOnce(toErrorResponseSpy);
        sinon.assert.calledWith(toErrorResponseSpy, expectedError);
        done();
      }
    };

    cliController.getStateOfDatasetRemoval(req, res);
  }));
});
