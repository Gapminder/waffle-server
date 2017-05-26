import '../../../../ws.repository';
import {expect} from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import {setTimeout} from 'timers';
import {logger} from '../../../../ws.config/log';
import * as cliController from '../../../../ws.routes/ddf/cli/cli.controller';
import * as routeUtils from '../../../../ws.routes/utils';
import * as authService from '../../../../ws.services/auth.service';
import * as cliService from '../../../../ws.services/cli.service';
import * as transactionsService from '../../../../ws.services/dataset-transactions.service';
import * as datasetsService from '../../../../ws.services/datasets.service';
import * as reposService from '../../../../ws.services/repos.service';
import * as cacheUtils from '../../../../ws.utils/cache-warmup';
import * as cliApi from 'waffle-server-import-cli';
import {Request, Response} from 'express';
import {json} from "body-parser";

const sandbox = sinonTest.configureTest(sinon);

describe('WS-CLI controller', () => {

  describe('Import Dataset', function() {
    it('should respond with an error when error happened during import and server didn\'t send response yet', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = {message: 'Boo!'};
      const expectedResponse = {success: false, error: 'Boo!'};

      const loggerStub = this.stub(logger, 'error');
      const cliServiceStub = this.stub(cliService, 'importDataset', (params, onImported) => onImported(expectedError));
      const resJsonSpy = this.spy();

      const req = {
        body: {}
      };

      const res = {
        headersSent: false,
        json: resJsonSpy
      };

      cliController.importDataset(req, res);

      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWith(resJsonSpy, expectedResponse);

      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWith(toErrorResponseSpy, expectedError);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWith(loggerStub, expectedError);

    }));

    it('should log an error when it occurred during import and server did send response already', sandbox(function () {
      const expectedError = {message: 'Boo!'};

      const loggerStub = this.stub(logger, 'error');
      const cliServiceStub = this.stub(cliService, 'importDataset', (params, onImported) => onImported(expectedError));
      const resJsonSpy = this.spy();

      const req = {
        body: {}
      };

      const res = {
        headersSent: true,
        json: resJsonSpy
      };

      cliController.importDataset(req, res);

      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWith(loggerStub, expectedError);
    }));

    it('should log that import succeeded', sandbox(function () {
      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();

      const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';
      const commit = '8744022391f4c6518b0d070e3b85ff12b7884dd2';

      const expectedMessage = `finished import for dataset '${github}' and commit '${commit}'`;
      const cliServiceStub = this.stub(cliService, 'importDataset', (params, onImported) => onImported());

      const req = {
        body: {
          github,
          commit
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.importDataset(req, res);

      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWith(loggerStub, expectedMessage);

      const params = cliServiceStub.args[0][0];

      expect(params).to.include.keys('github', 'commit', 'lifecycleHooks');
      expect(params.github).to.equal(github);
      expect(params.commit).to.equal(commit);

      expect(params.lifecycleHooks).to.include.keys('onTransactionCreated');
      expect(params.lifecycleHooks.onTransactionCreated).to.be.instanceof(Function);
    }));

    it('should release connection once transaction was created for import process', sandbox(function() {
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Dataset importing is in progress ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'importDataset', params => {
        params.lifecycleHooks.onTransactionCreated();
      });

      const req = {
        body: {}
      };

      const res = {
        headersSent: false,
        json: resJsonSpy
      };

      cliController.importDataset(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    }));

    it('should do nothing if response was already sent and transaction was created after', sandbox(function () {
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');

      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'importDataset', params => {
        params.lifecycleHooks.onTransactionCreated();
      });

      const req = {
        body: {}
      };

      const res = {
        headersSent: true,
        json: resJsonSpy
      };

      cliController.importDataset(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.notCalled(toMessageResponseSpy);
    }));
  });

  describe('Clean cache', function() {
    it('should clean cache', sandbox(function () {
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Cache is clean';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'cleanDdfRedisCache', onCleaned => onCleaned(null));

      const req = {
        user: {
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.cleanCache(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    }));

    it('should not clean cache cause user is not authenticated', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'cleanDdfRedisCache');

      const req = {};
      const res = {
        json: resJsonSpy
      };

      cliController.cleanCache(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error if cache clean failed', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'cleanDdfRedisCache', onCleaned => onCleaned(expectedError));

      const req = {
        user: {
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.cleanCache(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));
  });

  describe('Clean repos folder', function() {
    it('should clean without errors', sandbox(function () {
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Repos folder was cleaned';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliApi, 'cleanRepos', (path, onCleaned) => onCleaned(null));

      const req = {
        user: {
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.cleanRepos(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    }));

    it('should not clean repos folder cause user is not authenticated', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to make this action';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliApi, 'cleanRepos');

      const req = {};
      const res = {
        json: resJsonSpy
      };

      cliController.cleanRepos(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error if repos folder cleaning was failed', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliApi, 'cleanRepos', (path, onCleaned) => onCleaned(expectedError));

      const req = {
        user: {
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.cleanRepos(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));
  });

  describe('Authenticate user', function() {
    it('should log an error when email is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Email was not provided';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req: any = {
        body: {}
      };

      const res: any = {
        json: resJsonSpy
      };

      cliController.getToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when password is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Password was not provided';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req: any = {
        body: {
          email: 'test'
        }
      };

      const res: any = {
        json: resJsonSpy
      };

      cliController.getToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when throw error during authenticating user', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const authServiceStub = this.stub(authService, 'authenticate', ({email, password}, onAuthenticated) => {
        return onAuthenticated(expectedError);
      });

      const req: any = {
        body: {
          email: 'test',
          password: '123'
        }
      };

      const res: any = {
        json: resJsonSpy
      };

      cliController.getToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(authServiceStub);
      sinon.assert.calledWith(authServiceStub, req.body);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should authenticate user', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = this.spy(routeUtils, 'toDataResponse');
      const expectedData = '111';
      const expectedResponse = {success: true, data: {token: expectedData}};

      const resJsonSpy = this.spy();
      const authServiceStub = this.stub(authService, 'authenticate', ({email, password}, onAuthenticated) => {
        return onAuthenticated(null, expectedData);
      });

      const req: any = {
        body: {
          email: 'test',
          password: '123'
        }
      };

      const res: any = {
        json: resJsonSpy
      };

      cliController.getToken(req, res);

      sinon.assert.calledOnce(authServiceStub);
      sinon.assert.calledWith(authServiceStub, req.body);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseStub);
      sinon.assert.calledWithExactly(toDataResponseStub, {token: expectedData});
    }));
  });

  describe('Get state of the latest Transaction', function() {
    it('should log an error when unauthenticated user request state of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Unauthenticated user cannot perform CLI operations';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when dataset name is absent in req.query', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'No dataset name was given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        query: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when transaction service coulnd\'t get status of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const transactionsServiceStub = this.stub(transactionsService, 'getStatusOfLatestTransactionByDatasetName', (datasetName, user, onStatusGot) => {
        return onStatusGot(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.query.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should get state of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = this.spy(routeUtils, 'toDataResponse');
      const expectedData = 'Complete';
      const expectedResponse = {success: true, data: expectedData};

      const resJsonSpy = this.spy();
      const transactionsServiceStub = this.stub(transactionsService, 'getStatusOfLatestTransactionByDatasetName', (datasetName, user, onStatusGot) => {
        return onStatusGot(null, expectedData);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.query.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseStub);
      sinon.assert.calledWithExactly(toDataResponseStub, expectedData);
    }));
  });

  describe('Activate rollback', function() {
    it('should log an error when unauthenticated user request activation rollback of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Unauthenticated user cannot perform CLI operations';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
      };

      const res = {
        json: resJsonSpy
      };

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when dataset name is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'No dataset name was given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when transaction service coulnd\'t activate rollback of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const transactionsServiceStub = this.stub(transactionsService, 'rollbackFailedTransactionFor', (datasetName, user, onRollbackActivated) => {
        return onRollbackActivated(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.body.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should activate rollback of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toMessageResponseStub = this.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Rollback completed successfully';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = this.spy();
      const transactionsServiceStub = this.stub(transactionsService, 'rollbackFailedTransactionFor', (datasetName, user, onRollbackActivated) => {
        return onRollbackActivated(null);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.body.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toMessageResponseStub);
      sinon.assert.calledWithExactly(toMessageResponseStub, expectedMessage);
    }));
  });

  describe('Removal Dataset Controller', function() {
    it('should log an error when unauthenticated user request remove dataset', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to remove dataset';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
      };

      const res = {
        json: resJsonSpy
      };

      cliController.removeDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when dataset name is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'No dataset name was given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.removeDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when dataset service coulnd\'t remove choosen dataset', sandbox(function() {
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
      const expectedError = 'Boo!';
      const expectedMessage = 'Dataset is being deleted ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const datasetsServiceStub = this.stub(datasetsService, 'removeDatasetData', (datasetName, user, onDatasetRemoved) => {
        return onDatasetRemoved(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.removeDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(datasetsServiceStub);
      sinon.assert.calledWith(datasetsServiceStub, req.body.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    }));

    it('should remove dataset', sandbox(function(done: Function) {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
      const expectedInfoMessage = 'Dataset has been deleted successfully';
      const expectedMessage = 'Dataset is being deleted ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = this.spy();
      const datasetsServiceStub = this.stub(datasetsService, 'removeDatasetData', (datasetName, user, onDatasetRemoved) => {
        return setTimeout(onDatasetRemoved, 1);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      const loggerStub = this.stub(logger, 'info', () => {
        sinon.assert.calledOnce(loggerStub);
        sinon.assert.calledWithExactly(loggerStub, expectedInfoMessage);
        sinon.assert.calledOnce(datasetsServiceStub);
        sinon.assert.calledWith(datasetsServiceStub, req.body.datasetName, req.user);
        sinon.assert.calledOnce(resJsonSpy);
        sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
        sinon.assert.notCalled(toErrorResponseSpy);
        sinon.assert.calledOnce(toMessageResponseSpy);
        sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
        sinon.assert.callOrder(datasetsServiceStub, toMessageResponseSpy, resJsonSpy, loggerStub);

        done();
      });

      cliController.removeDataset(req, res);
    }));
  });

  describe('Get available Datasets and Versions', function() {
    it('should log an error when unauthenticated user request activation rollback of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getAvailableDatasetsAndVersions(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when cli service coulnd\'t activate rollback of the latest transaction', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getAvailableDatasetsAndVersions', (user, onDatasetAndVersionsGot) => {
        return onDatasetAndVersionsGot(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getAvailableDatasetsAndVersions(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should get available datasets and versions', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = this.spy(routeUtils, 'toDataResponse');
      const expectedMessage = `finished getting available datasets and versions`;
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getAvailableDatasetsAndVersions', (user, onDatasetAndVersionsGot) => {
        return onDatasetAndVersionsGot(null, expectedData);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getAvailableDatasetsAndVersions(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseStub);
      sinon.assert.calledWithExactly(toDataResponseStub, expectedData);
    }));
  });

  describe('Update Dataset incrementally', function() {
    it('should log an error when unauthenticated user tries to update dataset incrementally', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Unauthenticated user cannot perform CLI operations';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        query: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when hashFrom url is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Start commit for update was not given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when hashTo url is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'End commit for update was not given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when github url is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Repository github url was not given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA',
          hashTo: 'BBBBBBB'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when cli service coulnd\'t update dataset incrementally and response header was not sent', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'updateIncrementally', (options,  onDatasetUpdated) => {
        return onDatasetUpdated(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA',
          hashTo: 'BBBBBBB',
          github: expectedGithubUrl
        }
      };

      const res = {
        json: resJsonSpy,
        headersSent: false
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      const actualOptions = cliServiceStub.args[0][0];
      expect(actualOptions.github).to.be.equal(expectedGithubUrl);
      expect(actualOptions.hashTo).to.be.equal(req.body.hashTo);
      expect(actualOptions.commit).to.be.equal(req.body.hashTo);
      expect(actualOptions.hashFrom).to.be.equal(req.body.hashFrom);
      expect(actualOptions.datasetName).to.be.equal(reposService.getRepoNameForDataset(expectedGithubUrl));
      expect(actualOptions.lifecycleHooks).to.exist;
      expect(actualOptions.lifecycleHooks).to.have.property('onTransactionCreated');
      expect(actualOptions.lifecycleHooks.onTransactionCreated).to.be.an.instanceof(Function);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when cli service coulnd\'t update dataset incrementally and response header was sent', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedError = 'Boo!';

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'updateIncrementally', (options,  onDatasetUpdated) => {
        return onDatasetUpdated(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA',
          hashTo: 'BBBBBBB',
          github: expectedGithubUrl
        }
      };

      const res = {
        json: resJsonSpy,
        headersSent: true
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      const actualOptions = cliServiceStub.args[0][0];
      expect(actualOptions.github).to.be.equal(expectedGithubUrl);
      expect(actualOptions.hashTo).to.be.equal(req.body.hashTo);
      expect(actualOptions.commit).to.be.equal(req.body.hashTo);
      expect(actualOptions.hashFrom).to.be.equal(req.body.hashFrom);
      expect(actualOptions.datasetName).to.be.equal(reposService.getRepoNameForDataset(expectedGithubUrl));
      expect(actualOptions.lifecycleHooks).to.exist;
      expect(actualOptions.lifecycleHooks).to.have.property('onTransactionCreated');
      expect(actualOptions.lifecycleHooks.onTransactionCreated).to.be.an.instanceof(Function);
      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.notCalled(toErrorResponseSpy);
    }));

    it('should get commit of latest dataset version', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedHashFrom = 'AAAAAAA';
      const expectedHashTo = 'BBBBBBB';
      const expectedMessage = `finished import for dataset '${expectedGithubUrl}' and commit '${expectedHashTo}'`;

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'updateIncrementally', (options, onDatasetUpdated) => {
        options.lifecycleHooks.onTransactionCreated();
        return onDatasetUpdated(null);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: expectedHashFrom,
          hashTo: expectedHashTo,
          github: expectedGithubUrl
        }
      };

      const res = {
        json: resJsonSpy,
        headersSent: true
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedMessage);
      sinon.assert.calledOnce(cliServiceStub);
      const actualOptions = cliServiceStub.args[0][0];
      expect(actualOptions.github).to.be.equal(expectedGithubUrl);
      expect(actualOptions.hashTo).to.be.equal(req.body.hashTo);
      expect(actualOptions.commit).to.be.equal(req.body.hashTo);
      expect(actualOptions.hashFrom).to.be.equal(req.body.hashFrom);
      expect(actualOptions.datasetName).to.be.equal(reposService.getRepoNameForDataset(expectedGithubUrl));
      expect(actualOptions.lifecycleHooks).to.exist;
      expect(actualOptions.lifecycleHooks).to.have.property('onTransactionCreated');
      expect(actualOptions.lifecycleHooks.onTransactionCreated).to.be.an.instanceof(Function);
      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.notCalled(toDataResponseSpy);
    }));

    it('should get commit of latest dataset version', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const toMessageResponseSpy = this.spy(routeUtils, 'toMessageResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedHashFrom = 'AAAAAAA';
      const expectedHashTo = 'BBBBBBB';
      const expectedInfoMessage = `finished import for dataset '${expectedGithubUrl}' and commit '${expectedHashTo}'`;
      const expectedMessage = 'Dataset updating is in progress ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'updateIncrementally', (options, onDatasetUpdated) => {
        options.lifecycleHooks.onTransactionCreated();
        return onDatasetUpdated(null);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: expectedHashFrom,
          hashTo: expectedHashTo,
          github: expectedGithubUrl
        }
      };

      const res = {
        json: resJsonSpy,
        headersSent: false
      };

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedInfoMessage);
      sinon.assert.calledOnce(cliServiceStub);
      const actualOptions = cliServiceStub.args[0][0];
      expect(actualOptions.github).to.be.equal(expectedGithubUrl);
      expect(actualOptions.hashTo).to.be.equal(req.body.hashTo);
      expect(actualOptions.commit).to.be.equal(req.body.hashTo);
      expect(actualOptions.hashFrom).to.be.equal(req.body.hashFrom);
      expect(actualOptions.datasetName).to.be.equal(reposService.getRepoNameForDataset(expectedGithubUrl));
      expect(actualOptions.lifecycleHooks).to.exist;
      expect(actualOptions.lifecycleHooks).to.have.property('onTransactionCreated');
      expect(actualOptions.lifecycleHooks.onTransactionCreated).to.be.an.instanceof(Function);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.notCalled(toDataResponseSpy);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    }));
  });

  describe('Get commit of the latest Dataset Version', function() {
    it('should log an error when unauthenticated user request commit of the latest dataset version', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Unauthenticated user cannot perform CLI operations';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        query: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when github url is absent in req.query', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Repository github url was not given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        query: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when cli service coulnd\'t get commit of the latest dataset version', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedGithubUrl = 'github:url';
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getCommitOfLatestDatasetVersion', (github, user,  onCommitGot) => {
        return onCommitGot(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          github: expectedGithubUrl
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.query.github, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should get commit of latest dataset version', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = this.spy(routeUtils, 'toDataResponse');
      const expectedGithubUrl = 'github:url';
      const expectedCommit = 'AAAAAAA';
      const expectedDatasetName = 'dataset';
      const expectedMessage = `finished getting latest commit '${expectedCommit}' for dataset '${expectedGithubUrl}'`;
      const expectedData = {
        github: expectedGithubUrl,
        dataset: expectedDatasetName,
        commit: expectedCommit
      };
      const expectedResponse = {
        success: true,
        data: expectedData
      };
      const result = {
        dataset: {
          path: expectedGithubUrl,
          name: expectedDatasetName
        },
        transaction: {
          commit: expectedCommit
        }
      };

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getCommitOfLatestDatasetVersion', (github, user, onCommitListGot) => {
        return onCommitListGot(null, result);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          github: expectedGithubUrl
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.query.github, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseStub);
      sinon.assert.calledWithExactly(toDataResponseStub, expectedData);
    }));
  });

  describe('Set default Dataset', function() {
    it('should log an error when unauthenticated user tries to set default dataset', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        body: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when dataset name is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Dataset name was not provided';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when hash commit is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Transaction commit was not provided';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond an error when cli service coulnd\'t set transaction as default one', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'setTransactionAsDefault', (userId, datasetName, transactionCommit, onDatasetUpdated) => {
        return onDatasetUpdated(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id, req.body.datasetName, req.body.commit);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond an error when cli service coulnd\'t clean redis cache', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const setTransactionAsDefaultStub = this.stub(cliService, 'setTransactionAsDefault', (userId, datasetName, transactionCommit, onDatasetUpdated) => {
        return onDatasetUpdated();
      });
      const cleanDdfRedisCacheStub = this.stub(cliService, 'cleanDdfRedisCache', (onCacheCleaned) => {
        return onCacheCleaned(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(setTransactionAsDefaultStub);
      sinon.assert.calledWith(setTransactionAsDefaultStub, req.user._id, req.body.datasetName, req.body.commit);
      sinon.assert.calledOnce(cleanDdfRedisCacheStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should log an error when cli service coulnd\'t warm up cache', sandbox(function() {
      const toDataResponse = this.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedData = {
        dataset: 'datasetName',
        transaction: 'AAAAAAA'
      };
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const setTransactionAsDefaultStub = this.stub(cliService, 'setTransactionAsDefault', (userId, datasetName, transactionCommit, onDatasetUpdated) => {
        return onDatasetUpdated(null, expectedData);
      });
      const cleanDdfRedisCacheStub = this.stub(cliService, 'cleanDdfRedisCache', (onCacheCleaned) => {
        return onCacheCleaned();
      });
      const cacheUtilsStub = this.stub(cacheUtils, 'warmUpCache', (onCacheWarmedUp) => {
        return onCacheWarmedUp(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'Cache warm up error. ', expectedError);
      sinon.assert.calledOnce(setTransactionAsDefaultStub);
      sinon.assert.calledWith(setTransactionAsDefaultStub, req.user._id, req.body.datasetName, req.body.commit);
      sinon.assert.calledOnce(cleanDdfRedisCacheStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponse);
      sinon.assert.calledWithExactly(toDataResponse, expectedData);
    }));

    it('should set default transaction for public dataset', sandbox(function() {
      const toDataResponse = this.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Cache is warmed up.';
      const expectedData = {
        dataset: 'datasetName',
        transaction: 'AAAAAAA'
      };
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const setTransactionAsDefaultStub = this.stub(cliService, 'setTransactionAsDefault', (userId, datasetName, transactionCommit, onDatasetUpdated) => {
        return onDatasetUpdated(null, expectedData);
      });
      const cleanDdfRedisCacheStub = this.stub(cliService, 'cleanDdfRedisCache', (onCacheCleaned) => {
        return onCacheCleaned();
      });
      const cacheUtilsStub = this.stub(cacheUtils, 'warmUpCache', (onCacheWarmedUp) => {
        return onCacheWarmedUp();
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(setTransactionAsDefaultStub);
      sinon.assert.calledWith(setTransactionAsDefaultStub, req.user._id, req.body.datasetName, req.body.commit);
      sinon.assert.calledOnce(cleanDdfRedisCacheStub);
      sinon.assert.calledOnce(cacheUtilsStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponse);
      sinon.assert.calledWithExactly(toDataResponse, expectedData);
    }));
  });

  describe('Get Datasets', function() {
    it('should get the list of available datasets for authenticated user', sandbox(function () {
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'findDatasetsWithVersions', (userId, onCleaned) => onCleaned(null, expectedData));

      const req = {
        user: {
          _id: '123',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getDatasets(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    }));

    it('should respond with an error if user is not authenticated', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'findDatasetsWithVersions');

      const req = {};
      const res = {
        json: resJsonSpy
      };

      cliController.getDatasets(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error if receiving available datasets got failed', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'findDatasetsWithVersions', (userId, onCleaned) => onCleaned(expectedError));

      const req = {
        user: {
          _id: '123',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));
  });

  describe('Get state of Dataset removal', function() {
    it('should fetch removal state of dataset that is being removed', sandbox(function (done: Function) {
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

    it('should respond with an error if smth went wrong during status fetching', sandbox(function (done: Function) {
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');

      const expectedError = 'Boo!';

      const loggerStub = this.stub(logger, 'error');
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

          sinon.assert.calledOnce(loggerStub);
          sinon.assert.calledWith(loggerStub, expectedError);

          sinon.assert.calledOnce(getRemovalStateForDatasetStub);
          sinon.assert.calledWith(getRemovalStateForDatasetStub, req.query.datasetName, req.user);
          done();
        }
      };

      cliController.getStateOfDatasetRemoval(req, res);
    }));

    it('should respond with an error if dataset name was not provided in request', sandbox(function (done: Function) {
      const loggerStub = this.stub(logger, 'error');
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

          sinon.assert.calledOnce(loggerStub);
          sinon.assert.calledWith(loggerStub, expectedError);

          done();
        }
      };

      cliController.getStateOfDatasetRemoval(req, res);
    }));

    it('should respond with an error if user is not authenticated', sandbox(function (done: Function) {
      const loggerStub = this.stub(logger, 'error');
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');

      const expectedError = 'Unauthenticated user cannot perform CLI operations';

      const req = {};

      const res = {
        json: () => {
          sinon.assert.notCalled(toDataResponseSpy);
          sinon.assert.calledOnce(toErrorResponseSpy);
          sinon.assert.calledWith(toErrorResponseSpy, expectedError);

          sinon.assert.calledOnce(loggerStub);
          sinon.assert.calledWith(loggerStub, expectedError);

          done();
        }
      };

      cliController.getStateOfDatasetRemoval(req, res);
    }));
  });

  describe('Get removable Datasets', function() {
    it('should get the list of removable datasets for authenticated user', sandbox(function () {
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const expectedInfoMessage = `finished getting removable datasets`;
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getRemovableDatasets', (userId, onCleaned) => onCleaned(null, expectedData));

      const req = {
        user: {
          _id: '123',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getRemovableDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedInfoMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    }));

    it('should respond with an error if user is not authenticated', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getRemovableDatasets');

      const req = {};
      const res = {
        json: resJsonSpy
      };

      cliController.getRemovableDatasets(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error if receiving removable datasets got failed', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getRemovableDatasets', (userId, onCleaned) => onCleaned(expectedError));

      const req = {
        user: {
          _id: '123',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getRemovableDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));
  });

  describe('Get private Datasets', function() {
    it('should get the list of private datasets for authenticated user', sandbox(function () {
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const expectedInfoMessage = `finished getting private datasets`;
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getPrivateDatasets', (userId, onCleaned) => onCleaned(null, expectedData));

      const req = {
        user: {
          _id: '123',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getPrivateDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedInfoMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    }));

    it('should respond with an error if user is not authenticated', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getPrivateDatasets');

      const req = {};
      const res = {
        json: resJsonSpy
      };

      cliController.getPrivateDatasets(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error if receiving private datasets got failed', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getPrivateDatasets', (userId, onCleaned) => onCleaned(expectedError));

      const req = {
        user: {
          _id: '123',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getPrivateDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));
  });

  describe('Generate Dataset access token', function() {
    it('should respond with an error when unauthenticated user request to generate dataset access token', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Unauthenticated user cannot perform CLI operations';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
      };

      const res = {
        json: resJsonSpy
      };

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error when dataset name is absent in req.body', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'No dataset name was given';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      };

      const res = {
        json: resJsonSpy
      };

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error when cli service coulnd\'t set access token for given dataset', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedResponse = {success: false, error: expectedError};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'setAccessTokenForDataset', (datasetName, userId, onDatasetRemoved) => {
        return onDatasetRemoved(expectedError);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.body.datasetName, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should respond with an error when cli service couln\'t find dataset', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Cannot generate access token for given dataset';
      const expectedResponse = {success: false, error: expectedError};

      const loggerErrorStub = this.stub(logger, 'error');
      const loggerWarnStub = this.stub(logger, 'warn');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'setAccessTokenForDataset', (datasetName, userId, onDatasetRemoved) => {
        return onDatasetRemoved(null, null);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const expectedWarn = `User was trying to generate an accessToken for not existing dataset: ${req.body.datasetName} or dataset that is not owned by him (Id: ${req.user._id}).`;

      const res = {
        json: resJsonSpy
      };

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerErrorStub);
      sinon.assert.calledWithExactly(loggerErrorStub, expectedError);
      sinon.assert.calledOnce(loggerWarnStub);
      sinon.assert.calledWithExactly(loggerWarnStub, expectedWarn);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.body.datasetName, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError);
    }));

    it('should generate dataset access token', sandbox(function() {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const expectedData = {
        _id: 'AAAAA',
        name: 'dataset',
        accessToken: 'TTTTTTTTT'
      };
      const expectedResponse = {success: true, data: {accessToken: expectedData.accessToken}};

      const loggerErrorStub = this.stub(logger, 'error');
      const loggerWarnStub = this.stub(logger, 'warn');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'setAccessTokenForDataset', (datasetName, userId, onDatasetRemoved) => {
        return onDatasetRemoved(null, expectedData);
      });

      const req = {
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.notCalled(loggerErrorStub);
      sinon.assert.notCalled(loggerWarnStub);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.body.datasetName, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, {accessToken: expectedData.accessToken});
    }));
  });

  describe('Get Datasets in progress', function() {
    it('should not fetch datasets in progress cause user is not authenticated', sandbox(function () {
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedMessage = 'There is no authenticated user to get its datasets';
      const expectedResponse = {success: false, error: expectedMessage};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'cleanDdfRedisCache');

      const req = {};
      const res = {
        json: resJsonSpy
      };

      cliController.getDatasetsInProgress(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedMessage);
      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedMessage);
    }));

    it('should fetch datasets that are currently in progress (being deleted, updated or imported)', sandbox(function () {
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const expectedData = [{
        name: 'dataset.name',
        githubUrl: 'dataset.path'
      }];
      const expectedMessage = 'finished getting private datasets is progress';

      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = this.stub(logger, 'info');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getDatasetsInProgress', (userId, onFound) => {
        return onFound(null, expectedData);
      });

      const req = {
        user: {
          _id: 'fakeId',
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getDatasetsInProgress(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    }));

    it('should respond with an error if trying to get datasets in progress got the error', sandbox(function () {
      const toDataResponseSpy = this.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = this.spy(routeUtils, 'toErrorResponse');
      const expectedMessage = 'Boo!';
      const expectedResponse = {success: false, error: expectedMessage};

      const loggerStub = this.stub(logger, 'error');
      const resJsonSpy = this.spy();
      const cliServiceStub = this.stub(cliService, 'getDatasetsInProgress', (userId, onFound) => {
        return onFound(expectedMessage);
      });

      const req = {
        user: {
          name: 'fake'
        }
      };

      const res = {
        json: resJsonSpy
      };

      cliController.getDatasetsInProgress(req, res);

      sinon.assert.notCalled(toDataResponseSpy);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, undefined);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedMessage);
    }));
  });
});
