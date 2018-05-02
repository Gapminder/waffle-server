import '../../../../ws.repository';
import {expect} from 'chai';
import * as sinon from 'sinon';
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
import * as ddfImportUtils from '../../../../ws.import/utils/import-ddf.utils';
import {mockReq, mockRes} from 'sinon-express-mock';

const sandbox = sinon.createSandbox();

describe('WS-CLI controller', () => {

  describe('Import Dataset', () => {
    afterEach(() => sandbox.restore());

    it('should respond with an error when error happened during import and server didn\'t send response yet', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {message: 'Boo!', place: 'default'};
      const expectedResponse = {success: false, error: 'Boo!'};

      const loggerStub = sandbox.stub(logger, 'error');
      const cliServiceStub = sandbox.stub(cliService, 'importDataset').callsFake((params, onImported) => onImported(expectedError));
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        headersSent: false,
        json: resJsonSpy
      });

      cliController.importDataset(req, res);

      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWith(resJsonSpy, expectedResponse);

      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWith(toErrorResponseSpy, expectedError);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWith(loggerStub, expectedError);

    });

    it('should log an error when it occurred during import and server did send response already', () => {
      const expectedError = {message: 'Boo!'};

      const loggerStub = sandbox.stub(logger, 'error');
      const cliServiceStub = sandbox.stub(cliService, 'importDataset').callsFake((params, onImported) => onImported(expectedError));
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        headersSent: true,
        json: resJsonSpy
      });

      cliController.importDataset(req, res);

      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWith(loggerStub, expectedError);
    });

    it('should log that import succeeded', () => {
      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();

      const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';
      const commit = '8744022391f4c6518b0d070e3b85ff12b7884dd2';

      const expectedMessage = `finished import for dataset '${github}' and commit '${commit}'`;
      const cliServiceStub = sandbox.stub(cliService, 'importDataset').callsFake((params, onImported) => onImported());

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {
          github,
          commit
        },
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

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
    });

    it('should release connection once transaction was created for import process', () => {
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Dataset importing is in progress ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'importDataset').callsFake((params) => {
        params.lifecycleHooks.onTransactionCreated();
      });

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        headersSent: false,
        json: resJsonSpy
      });

      cliController.importDataset(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    });

    it('should do nothing if response was already sent and transaction was created after', () => {
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');

      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'importDataset').callsFake((params) => {
        params.lifecycleHooks.onTransactionCreated();
      });

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        requestStartTime: 123
      });

      const res = mockRes({
        headersSent: true,
        json: resJsonSpy
      });

      cliController.importDataset(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.notCalled(resJsonSpy);
      sinon.assert.notCalled(toMessageResponseSpy);
    });
  });

  describe('Clean cache', () => {
    afterEach(() => sandbox.restore());

    it('should clean cache', () => {
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Cache is clean';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'cleanDdfRedisCache').callsFake((onCleaned) => onCleaned(null));

      const req = mockReq({
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanCache(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    });

    it('should not clean cache cause user is not authenticated', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };
      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'cleanDdfRedisCache');

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanCache(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error if cache clean failed', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {code: 999, message: 'Boo!', place: 'default', type: 'INTERNAL_SERVER_TEXT_ERROR'};
      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'cleanDdfRedisCache').callsFake((onCleaned: Function) => onCleaned(expectedError.message));

      const req = mockReq({
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanCache(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });
  });

  describe('Clean repos folder', () => {
    afterEach(() => sandbox.restore());

    it('should clean and clone without errors', (done: Function) => {
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Repos folder was cleaned and cloned successfully';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = sandbox.stub().callsFake((result: any) => {
        expect(result).to.be.deep.equal(expectedResponse);

        sinon.assert.calledOnce(cliServiceStub);
        sinon.assert.calledOnce(ddfImportUtilsStub);
        sinon.assert.calledOnce(toMessageResponseSpy);
        sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);

        return done();
      });
      const cliServiceStub = sandbox.stub(cliApi, 'cleanRepos').callsArgWithAsync(1, null);
      const ddfImportUtilsStub = sandbox.stub(ddfImportUtils, 'cloneImportedDdfRepos').callsFake(() => Promise.resolve());
      sandbox.stub(logger, 'info');

      const req = mockReq({
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanRepos(req, res);
    });

    it('should clean without errors, but cloning was failed', (done: Function) => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Repos folder was cleaned and cloned successfully';
      const expectedResponse = {success: false, error: expectedError};

      const resJsonSpy = sandbox.stub().callsFake((result: any) => {
        expect(result).to.be.deep.equal(expectedResponse);

        sinon.assert.calledOnce(cliServiceStub);
        sinon.assert.calledOnce(ddfImportUtilsStub);
        sinon.assert.calledOnce(toErrorResponseSpy);
        sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError, req);

        return done();
      });
      const cliServiceStub = sandbox.stub(cliApi, 'cleanRepos').callsArgWithAsync(1, null);
      const ddfImportUtilsStub = sandbox.stub(ddfImportUtils, 'cloneImportedDdfRepos').callsFake(() => Promise.reject(expectedError));

      const req = mockReq({
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanRepos(req, res);
    });

    it('should not clean repos folder cause user is not authenticated', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to make this action',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };
      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliApi, 'cleanRepos');

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanRepos(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error if repos folder cleaning was failed', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliApi, 'cleanRepos').callsFake((path, onCleaned) => onCleaned(expectedError.message));

      const req = mockReq({
        user: {
          name: 'fake'
        },
        body: {},
        queryStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.cleanRepos(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });
  });

  describe('Authenticate user', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when email is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Email was not provided',
        place: 'getToken',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req, 'getToken');
    });

    it('should log an error when password is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Password was not provided',
        place: 'getToken',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        body: {
          email: 'test'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req, 'getToken');
    });

    it('should log an error when throw error during authenticating user', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'getToken',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const authServiceStub = sandbox.stub(authService, 'authenticate').callsFake(({email, password}, onAuthenticated) => {
        return onAuthenticated(expectedError.message);
      });

      const req = mockReq({
        body: {
          email: 'test',
          password: '123'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(authServiceStub);
      sinon.assert.calledWith(authServiceStub, req.body);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req, 'getToken');
    });

    it('should authenticate user', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedData = '111';
      const expectedResponse = {success: true, data: {token: expectedData}};

      const resJsonSpy = sandbox.spy();
      const authServiceStub = sandbox.stub(authService, 'authenticate').callsFake(({email, password}, onAuthenticated) => {
        return onAuthenticated(null, expectedData);
      });

      const req = mockReq({
        body: {
          email: 'test',
          password: '123'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getToken(req, res);

      sinon.assert.calledOnce(authServiceStub);
      sinon.assert.calledWith(authServiceStub, req.body);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseStub);
      sinon.assert.calledWithExactly(toDataResponseStub, {token: expectedData});
    });
  });

  describe('Get state of the latest Transaction', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user request state of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Unauthenticated user cannot perform CLI operations',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when dataset name is absent in req.query', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'No dataset name was given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        query: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when transaction service coulnd\'t get status of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const transactionsServiceStub = sandbox.stub(transactionsService, 'getStatusOfLatestTransactionByDatasetName').callsFake((datasetName, user, onStatusGot) => {
        return onStatusGot(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.query.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should get state of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedData = 'Complete';
      const expectedResponse = {success: true, data: expectedData};

      const resJsonSpy = sandbox.spy();
      const transactionsServiceStub = sandbox.stub(transactionsService, 'getStatusOfLatestTransactionByDatasetName').callsFake((datasetName, user, onStatusGot) => {
        return onStatusGot(null, expectedData);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getStateOfLatestTransaction(req, res);

      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.query.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toDataResponseStub);
      sinon.assert.calledWithExactly(toDataResponseStub, expectedData);
    });
  });

  describe('Activate rollback', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user request activation rollback of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Unauthenticated user cannot perform CLI operations',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when dataset name is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'No dataset name was given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when transaction service coulnd\'t activate rollback of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const transactionsServiceStub = sandbox.stub(transactionsService, 'rollbackFailedTransactionFor').callsFake((datasetName, user, onRollbackActivated) => {
        return onRollbackActivated(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.body.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should activate rollback of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toMessageResponseStub = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedMessage = 'Rollback completed successfully';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = sandbox.spy();
      const transactionsServiceStub = sandbox.stub(transactionsService, 'rollbackFailedTransactionFor').callsFake((datasetName, user, onRollbackActivated) => {
        return onRollbackActivated(null);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.activateRollback(req, res);

      sinon.assert.calledOnce(transactionsServiceStub);
      sinon.assert.calledWith(transactionsServiceStub, req.body.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.notCalled(toErrorResponseSpy);
      sinon.assert.calledOnce(toMessageResponseStub);
      sinon.assert.calledWithExactly(toMessageResponseStub, expectedMessage);
    });
  });

  describe('Removal Dataset Controller', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user request remove dataset', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to remove dataset',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.removeDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when dataset name is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'No dataset name was given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.removeDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when dataset service coulnd\'t remove choosen dataset', () => {
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedError = 'Boo!';
      const expectedMessage = 'Dataset is being deleted ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const datasetsServiceStub = sandbox.stub(datasetsService, 'removeDatasetData').callsFake((datasetName, user, onDatasetRemoved) => {
        return onDatasetRemoved(expectedError);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.removeDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(datasetsServiceStub);
      sinon.assert.calledWith(datasetsServiceStub, req.body.datasetName, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toMessageResponseSpy);
      sinon.assert.calledWithExactly(toMessageResponseSpy, expectedMessage);
    });

    it('should remove dataset', (done: Function) => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedInfoMessage = 'Dataset has been deleted successfully';
      const expectedMessage = 'Dataset is being deleted ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const resJsonSpy = sandbox.spy();
      const datasetsServiceStub = sandbox.stub(datasetsService, 'removeDatasetData').callsFake((datasetName, user, onDatasetRemoved) => {
        return setTimeout(onDatasetRemoved, 1);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      const loggerStub = sandbox.stub(logger, 'info').callsFake(() => {
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
    });
  });

  describe('Get available Datasets and Versions', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user request activation rollback of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getAvailableDatasetsAndVersions(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when cli service coulnd\'t activate rollback of the latest transaction', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getAvailableDatasetsAndVersions').callsFake((user, onDatasetAndVersionsGot) => {
        return onDatasetAndVersionsGot(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getAvailableDatasetsAndVersions(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should get available datasets and versions', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedMessage = `finished getting available datasets and versions`;
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getAvailableDatasetsAndVersions').callsFake((user, onDatasetAndVersionsGot) => {
        return onDatasetAndVersionsGot(null, expectedData);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

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
    });
  });

  describe('Update Dataset incrementally', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user tries to update dataset incrementally', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Unauthenticated user cannot perform CLI operations',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when hashFrom url is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Start commit for update was not given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when hashTo url is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'End commit for update was not given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when github url is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Repository github url was not given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA',
          hashTo: 'BBBBBBB'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.updateIncrementally(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when cli service coulnd\'t update dataset incrementally and response header was not sent', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'updateIncrementally').callsFake((options, onDatasetUpdated) => {
        return onDatasetUpdated(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA',
          hashTo: 'BBBBBBB',
          github: expectedGithubUrl
        }
      });

      const res = mockRes({
        json: resJsonSpy,
        headersSent: false
      });

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
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when cli service coulnd\'t update dataset incrementally and response header was sent', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedError = 'Boo!';

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'updateIncrementally').callsFake((options, onDatasetUpdated) => {
        return onDatasetUpdated(expectedError);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: 'AAAAAAA',
          hashTo: 'BBBBBBB',
          github: expectedGithubUrl
        }
      });

      const res = mockRes({
        json: resJsonSpy,
        headersSent: true
      });

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
    });

    it('should get commit of latest dataset version', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedHashFrom = 'AAAAAAA';
      const expectedHashTo = 'BBBBBBB';
      const expectedMessage = `finished import for dataset '${expectedGithubUrl}' and commit '${expectedHashTo}'`;

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'updateIncrementally').callsFake((options, onDatasetUpdated) => {
        options.lifecycleHooks.onTransactionCreated();
        return onDatasetUpdated(null);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: expectedHashFrom,
          hashTo: expectedHashTo,
          github: expectedGithubUrl
        }
      });

      const res = mockRes({
        json: resJsonSpy,
        headersSent: true
      });

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
    });

    it('should get commit of latest dataset version', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const toMessageResponseSpy = sandbox.spy(routeUtils, 'toMessageResponse');
      const expectedGithubUrl = 'git@github.com:Gapminder/waffle-server.git#stage';
      const expectedHashFrom = 'AAAAAAA';
      const expectedHashTo = 'BBBBBBB';
      const expectedInfoMessage = `finished import for dataset '${expectedGithubUrl}' and commit '${expectedHashTo}'`;
      const expectedMessage = 'Dataset updating is in progress ...';
      const expectedResponse = {success: true, message: expectedMessage};

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'updateIncrementally').callsFake((options, onDatasetUpdated) => {
        options.lifecycleHooks.onTransactionCreated();
        return onDatasetUpdated(null);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          hashFrom: expectedHashFrom,
          hashTo: expectedHashTo,
          github: expectedGithubUrl
        }
      });

      const res = mockRes({
        json: resJsonSpy,
        headersSent: false
      });

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
    });
  });

  describe('Get commit of the latest Dataset Version', () => {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user request commit of the latest dataset version', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Unauthenticated user cannot perform CLI operations',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when github url is absent in req.query', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Repository github url was not given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        query: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when cli service coulnd\'t get commit of the latest dataset version', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedGithubUrl = 'github:url';
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getCommitOfLatestDatasetVersion').callsFake((github, user, onCommitGot) => {
        return onCommitGot(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          github: expectedGithubUrl
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getCommitOfLatestDatasetVersion(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.query.github, req.user);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should get commit of latest dataset version', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseStub = sandbox.spy(routeUtils, 'toDataResponse');
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

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getCommitOfLatestDatasetVersion').callsFake((github, user, onCommitListGot) => {
        return onCommitListGot(null, result);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        query: {
          github: expectedGithubUrl
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

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
    });
  });

  describe('Set default Dataset', function () {
    afterEach(() => sandbox.restore());

    it('should log an error when unauthenticated user tries to set default dataset', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when dataset name is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Dataset name was not provided',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when hash commit is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Transaction commit was not provided',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond an error when cli service coulnd\'t set transaction as default one', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'setTransactionAsDefault').callsFake((userId, datasetName, transactionCommit, onDatasetUpdated) => {
        return onDatasetUpdated(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id, req.body.datasetName, req.body.commit);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond an error when cli service coulnd\'t clean redis cache', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const setTransactionAsDefaultStub = sandbox.stub(cliService, 'setTransactionAsDefault').callsFake((userId, datasetName, transactionCommit, onDatasetUpdated) => {
        return onDatasetUpdated();
      });
      const cleanDdfRedisCacheStub = sandbox.stub(cliService, 'cleanDdfRedisCache').callsFake((onCacheCleaned) => {
        return onCacheCleaned(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.setDefaultDataset(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(setTransactionAsDefaultStub);
      sinon.assert.calledWith(setTransactionAsDefaultStub, req.user._id, req.body.datasetName, req.body.commit);
      sinon.assert.calledOnce(cleanDdfRedisCacheStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should log an error when cli service coulnd\'t warm up cache', () => {
      const toDataResponse = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Boo!';
      const expectedData = {
        dataset: 'datasetName',
        transaction: 'AAAAAAA'
      };
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const setTransactionAsDefaultStub = sandbox.stub(cliService, 'setTransactionAsDefault').callsFake((userId, datasetName, transactionCommit, onDatasetUpdated: Function) => {
        return onDatasetUpdated(null, expectedData);
      });
      const cleanDdfRedisCacheStub = sandbox.stub(cliService, 'cleanDdfRedisCache').callsFake((onCacheCleaned: Function) => {
        return onCacheCleaned();
      });
      const cacheUtilsStub = sandbox.stub(cacheUtils, 'warmUpCache').callsFake((onCacheWarmedUp: Function) => {
        return onCacheWarmedUp(expectedError);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

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
    });

    it('should set default transaction for public dataset', () => {
      const toDataResponse = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = 'Cache is warmed up.';
      const expectedData = {
        dataset: 'datasetName',
        transaction: 'AAAAAAA'
      };
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const setTransactionAsDefaultStub = sandbox.stub(cliService, 'setTransactionAsDefault').callsFake((userId, datasetName, transactionCommit, onDatasetUpdated: Function) => {
        return onDatasetUpdated(null, expectedData);
      });
      const cleanDdfRedisCacheStub = sandbox.stub(cliService, 'cleanDdfRedisCache').callsFake((onCacheCleaned: Function) => {
        return onCacheCleaned();
      });
      const cacheUtilsStub = sandbox.stub(cacheUtils, 'warmUpCache').callsFake((onCacheWarmedUp: Function) => {
        return onCacheWarmedUp();
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'datasetName',
          commit: 'AAAAAAA'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

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
    });
  });

  describe('Get Datasets', function () {
    afterEach(() => sandbox.restore());

    it('should get the list of available datasets for authenticated user', () => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'findDatasetsWithVersions').callsFake((userId, onCleaned) => onCleaned(null, expectedData));

      const req = mockReq({
        user: {
          _id: '123',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getDatasets(req, res);

      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    });

    it('should respond with an error if user is not authenticated', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'findDatasetsWithVersions');

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });
      ;
      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getDatasets(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error if receiving available datasets got failed', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'findDatasetsWithVersions').callsFake((userId, onCleaned) => onCleaned(expectedError.message));

      const req = mockReq({
        user: {
          _id: '123',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });
  });

  describe('Get state of Dataset removal', () => {
    afterEach(() => sandbox.restore());

    it('should fetch removal state of dataset that is being removed', (done: Function) => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');

      const removalStatus = {
        concepts: 42,
        entities: 42,
        datapoints: 42
      };

      const getRemovalStateForDatasetStub = sandbox.stub(datasetsService, 'getRemovalStateForDataset');
      getRemovalStateForDatasetStub
        .onFirstCall().callsArgWith(2, null, removalStatus);

      const req = mockReq({
        query: {
          datasetName: 'datasetName'
        },
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: () => {
          sinon.assert.notCalled(toErrorResponseSpy);
          sinon.assert.calledOnce(toDataResponseSpy);
          sinon.assert.calledWith(toDataResponseSpy, removalStatus);

          sinon.assert.calledOnce(getRemovalStateForDatasetStub);
          sinon.assert.calledWith(getRemovalStateForDatasetStub, req.query.datasetName, req.user);

          done();
        }
      });

      cliController.getStateOfDatasetRemoval(req, res);
    });

    it('should respond with an error if smth went wrong during status fetching', (done: Function) => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');

      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };


      const loggerStub = sandbox.stub(logger, 'error');
      const getRemovalStateForDatasetStub = sandbox.stub(datasetsService, 'getRemovalStateForDataset');
      getRemovalStateForDatasetStub
        .onFirstCall().callsArgWith(2, expectedError.message, null);

      const req = mockReq({
        query: {
          datasetName: 'datasetName'
        },
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: () => {
          sinon.assert.notCalled(toDataResponseSpy);
          sinon.assert.calledOnce(toErrorResponseSpy);
          sinon.assert.calledWith(toErrorResponseSpy, expectedError.message, req);

          sinon.assert.calledOnce(loggerStub);
          sinon.assert.calledWith(loggerStub, expectedError);

          sinon.assert.calledOnce(getRemovalStateForDatasetStub);
          sinon.assert.calledWith(getRemovalStateForDatasetStub, req.query.datasetName, req.user);
          done();
        }
      });

      cliController.getStateOfDatasetRemoval(req, res);
    });

    it('should respond with an error if dataset name was not provided in request', (done: Function) => {
      const loggerStub = sandbox.stub(logger, 'error');
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');

      const expectedError = {
        code: 999,
        message: 'No dataset name was given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const req = mockReq({
        query: {},
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: () => {
          sinon.assert.notCalled(toDataResponseSpy);
          sinon.assert.calledOnce(toErrorResponseSpy);
          sinon.assert.calledWith(toErrorResponseSpy, expectedError.message, req);

          sinon.assert.calledOnce(loggerStub);
          sinon.assert.calledWith(loggerStub, expectedError);

          done();
        }
      });

      cliController.getStateOfDatasetRemoval(req, res);
    });

    it('should respond with an error if user is not authenticated', (done: Function) => {
      const loggerStub = sandbox.stub(logger, 'error');
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');

      const expectedError = {
        code: 999,
        message: 'Unauthenticated user cannot perform CLI operations',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };


      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: () => {
          sinon.assert.notCalled(toDataResponseSpy);
          sinon.assert.calledOnce(toErrorResponseSpy);
          sinon.assert.calledWith(toErrorResponseSpy, expectedError.message, req);

          sinon.assert.calledOnce(loggerStub);
          sinon.assert.calledWith(loggerStub, expectedError);

          done();
        }
      });

      cliController.getStateOfDatasetRemoval(req, res);
    });
  });

  describe('Get removable Datasets', () => {
    afterEach(() => sandbox.restore());

    it('should get the list of removable datasets for authenticated user', () => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedInfoMessage = `finished getting removable datasets`;
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getRemovableDatasets').callsFake((userId, onCleaned) => onCleaned(null, expectedData));

      const req = mockReq({
        user: {
          _id: '123',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getRemovableDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedInfoMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    });

    it('should respond with an error if user is not authenticated', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getRemovableDatasets');

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });
      ;
      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getRemovableDatasets(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error if receiving removable datasets got failed', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getRemovableDatasets').callsFake((userId, onCleaned) => onCleaned(expectedError.message));

      const req = mockReq({
        user: {
          _id: '123',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getRemovableDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });
  });

  describe('Get private Datasets', () => {
    afterEach(() => sandbox.restore());

    it('should get the list of private datasets for authenticated user', () => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedInfoMessage = `finished getting private datasets`;
      const expectedData = [];
      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getPrivateDatasets').callsFake((userId, onCleaned) => onCleaned(null, expectedData));

      const req = mockReq({
        user: {
          _id: '123',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getPrivateDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedInfoMessage);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    });

    it('should respond with an error if user is not authenticated', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getPrivateDatasets');

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });
      ;
      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getPrivateDatasets(req, res);

      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error if receiving private datasets got failed', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getPrivateDatasets').callsFake((userId, onCleaned) => onCleaned(expectedError.message));

      const req = mockReq({
        user: {
          _id: '123',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getPrivateDatasets(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });
  });

  describe('Generate Dataset access token', () => {
    afterEach(() => sandbox.restore());

    it('should respond with an error when unauthenticated user request to generate dataset access token', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Unauthenticated user cannot perform CLI operations',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });
      ;

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error when dataset name is absent in req.body', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'No dataset name was given',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {}
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error when cli service coulnd\'t set access token for given dataset', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'setAccessTokenForDataset').callsFake((datasetName, userId, onDatasetRemoved) => {
        return onDatasetRemoved(expectedError.message);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.generateDatasetAccessToken(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.body.datasetName, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should respond with an error when cli service couln\'t find dataset', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'Cannot generate access token for given dataset',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerErrorStub = sandbox.stub(logger, 'error');
      const loggerWarnStub = sandbox.stub(logger, 'warn');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'setAccessTokenForDataset').callsFake((datasetName, userId, onDatasetRemoved) => {
        return onDatasetRemoved(null, null);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const expectedWarn = `User was trying to generate an accessToken for not existing dataset: ${req.body.datasetName} or dataset that is not owned by him (Id: ${req.user._id}).`;

      const res = mockRes({
        json: resJsonSpy
      });

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
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should generate dataset access token', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedData = {
        _id: 'AAAAA',
        name: 'dataset',
        accessToken: 'TTTTTTTTT'
      };
      const expectedResponse = {success: true, data: {accessToken: expectedData.accessToken}};

      const loggerErrorStub = sandbox.stub(logger, 'error');
      const loggerWarnStub = sandbox.stub(logger, 'warn');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'setAccessTokenForDataset').callsFake((datasetName, userId, onDatasetRemoved) => {
        return onDatasetRemoved(null, expectedData);
      });

      const req = mockReq({
        user: {
          _id: '123',
          name: 'user'
        },
        body: {
          datasetName: 'dataset'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

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
    });
  });

  describe('Get Datasets in progress', () => {
    afterEach(() => sandbox.restore());

    it('should not fetch datasets in progress cause user is not authenticated', () => {
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'There is no authenticated user to get its datasets',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'cleanDdfRedisCache');

      const req = mockReq({
        query: '',
        queryParser: {
          query: '',
          queryType: ''
        },
        body: {},
        requestStartTime: 123
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getDatasetsInProgress(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.notCalled(cliServiceStub);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });

    it('should fetch datasets that are currently in progress (being deleted, updated or imported)', () => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const expectedData = [{
        name: 'dataset.name',
        githubUrl: 'dataset.path'
      }];
      const expectedError = 'finished getting private datasets is progress';

      const expectedResponse = {success: true, data: expectedData};

      const loggerStub = sandbox.stub(logger, 'info');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getDatasetsInProgress').callsFake((userId, onFound) => {
        return onFound(null, expectedData);
      });

      const req = mockReq({
        user: {
          _id: 'fakeId',
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getDatasetsInProgress(req, res);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, req.user._id);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toDataResponseSpy);
      sinon.assert.calledWithExactly(toDataResponseSpy, expectedData);
    });

    it('should respond with an error if trying to get datasets in progress got the error', () => {
      const toDataResponseSpy = sandbox.spy(routeUtils, 'toDataResponse');
      const toErrorResponseSpy = sandbox.spy(routeUtils, 'toErrorResponse');
      const expectedError = {
        code: 999,
        message: 'finished getting private datasets is progress',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };
      const expectedResponse = {success: false, error: expectedError.message};

      const loggerStub = sandbox.stub(logger, 'error');
      const resJsonSpy = sandbox.spy();
      const cliServiceStub = sandbox.stub(cliService, 'getDatasetsInProgress').callsFake((userId, onFound) => {
        return onFound(expectedError.message);
      });

      const req = mockReq({
        user: {
          name: 'fake'
        }
      });

      const res = mockRes({
        json: resJsonSpy
      });

      cliController.getDatasetsInProgress(req, res);

      sinon.assert.notCalled(toDataResponseSpy);
      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, expectedError);
      sinon.assert.calledOnce(cliServiceStub);
      sinon.assert.calledWith(cliServiceStub, undefined);
      sinon.assert.calledOnce(resJsonSpy);
      sinon.assert.calledWithExactly(resJsonSpy, expectedResponse);
      sinon.assert.calledOnce(toErrorResponseSpy);
      sinon.assert.calledWithExactly(toErrorResponseSpy, expectedError.message, req);
    });
  });
});
