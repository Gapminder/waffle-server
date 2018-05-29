import * as _ from 'lodash';
import * as url from 'url';
import * as crypto from 'crypto';
import * as URLON from 'urlon';
import * as express from 'express';

import * as sinon from 'sinon';
import {expect} from 'chai';

import {logger} from '../../ws.config/log';
import {config} from '../../ws.config/config';
import * as routeUtils from '../../ws.routes/utils';
import {constants} from '../../ws.utils/constants';

import * as commonService from '../../ws.services/common.service';
import {RequestTags} from '../../ws.services/telegraf.service';
import {mockReq, mockRes} from 'sinon-express-mock';
import * as passport from 'passport';

const sandbox = sinon.createSandbox();

describe('Routes utils', () => {
  const ORIGINAL_PATH_TO_DDF_REPOSITORIES = config.PATH_TO_DDF_REPOSITORIES;
  before(() => {
    config.PATH_TO_DDF_REPOSITORIES = '/home/anonymous/repos';
  });

  after(() => {
    config.PATH_TO_DDF_REPOSITORIES = ORIGINAL_PATH_TO_DDF_REPOSITORIES;
  });

  describe('#cache config', () => {

    afterEach(() => sandbox.restore());

    it('should generate correct cache key', (done) => {
      const expectedCachePrefix = 'MyPrefix';
      const expectedMethod = 'GET';

      const req = mockReq({
        query: {},
        body: {bla: 42},
        method: expectedMethod,
        url: '/status?name=ryan'
      });

      const parsedUrl = url.parse(req.url);
      const md5Payload = crypto.createHash('md5').update(parsedUrl.query + JSON.stringify(req.body)).digest('hex');
      const expectedCacheKey = `${expectedCachePrefix}-${req.method}-${parsedUrl.pathname}-${md5Payload}`;

      const res = mockRes({
        express_redis_cache_name: null
      });

      const next = () => {
        expect(res.express_redis_cache_name).to.equal(expectedCacheKey);
        done();
      };

      routeUtils.getCacheConfig(expectedCachePrefix)(req, res, next);
    });

    it('should use default cache key prefix if it was not provided', (done: Function) => {
      const expectedCachePrefix = 'PREFIX_NOT_SET';
      const expectedMethod = 'GET';

      const req = mockReq({
        query: {},
        body: {bla: 42},
        method: expectedMethod,
        url: '/status?name=ryan'
      });

      const parsedUrl = url.parse(req.url);
      const md5Payload = crypto.createHash('md5').update(parsedUrl.query + JSON.stringify(req.body)).digest('hex');
      const expectedCacheKey = `${expectedCachePrefix}-${req.method}-${parsedUrl.pathname}-${md5Payload}`;

      const res = mockRes({
        express_redis_cache_name: null
      });

      const next = () => {
        expect(res.express_redis_cache_name).to.equal(expectedCacheKey);
        done();
      };

      routeUtils.getCacheConfig()(req, res, next);
    });

    it('should invalidate redis cache if force option is provided', (done) => {
      const req = mockReq({
        query: {force: 'true'}
      });

      const res = mockRes({
        use_express_redis_cache: null
      });

      const next = () => {
        expect(res.use_express_redis_cache).to.be.false;
        done();
      };

      routeUtils.getCacheConfig()(req, res, next);
    });
  });

  describe('#parse query from url and populate request body with a result', () => {

    afterEach(() => sandbox.restore());

    it('should parse query as json if "query" param given in url', (done: Function) => {
      const ddfql = {
        from: 'entities',
        select: {
          key: ['company']
        }
      };

      const queryRaw = encodeURIComponent(JSON.stringify(ddfql));

      const req = mockReq({
        query: {
          query: queryRaw
        }
      });

      const res = mockRes({});

      const loggerInfoStub = sandbox.stub(logger, 'info');

      const next = () => {
        const expectedBody = ddfql;
        expect(req.body).to.deep.equal(expectedBody);
        expect(_.pick(req.queryParser, ['query', 'queryType'])).to.deep.equal({query: queryRaw, queryType: 'JSON'});

        sinon.assert.calledOnce(loggerInfoStub);
        sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: queryRaw});

        done();
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('should respond with an error when it is impossible to parse json', (done: Function) => {
      const req = mockReq({
        query: {
          query: 'bla'
        }
      });

      const loggerInfoStub = sandbox.stub(logger, 'info');

      const res = mockRes({
        json: (response: any) => {
          expect(response.success).to.be.false;
          expect(response.error).to.equal('Query was sent in incorrect format');
          sinon.assert.calledOnce(loggerInfoStub);
          sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: req.query.query});

          done();
        }
      });

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware');
      };
      sandbox.stub(logger, 'error');

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('should parse query as urlon if "query" param is not given in url', (done: Function) => {
      const ddfql = {
        from: 'entities',
        select: {
          key: ['company']
        }
      };

      const queryRaw = URLON.stringify(ddfql);

      const req = mockReq({
        query: {},
        url: `/api/ddf/ql/?${queryRaw}`
      });

      const res = mockRes({});

      const loggerInfoStub = sandbox.stub(logger, 'info');

      const next = () => {
        const expectedBody = ddfql;
        expect(req.body).to.deep.equal(expectedBody);
        expect(_.pick(req.queryParser, ['query', 'queryType'])).to.deep.equal({query: queryRaw, queryType: 'URLON'});

        sinon.assert.calledOnce(loggerInfoStub);
        sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: queryRaw});
        done();
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('should respond with an error when it is impossible to parse urlon', (done: Function) => {
      const req = mockReq({
        query: {},
        url: '/api/ddf/ql/?%20%'
      });

      const queryRaw = url.parse(req.url).query;

      const loggerInfoStub = sandbox.stub(logger, 'info');
      sandbox.stub(logger, 'error');

      const res = mockRes({
        json: (response: any) => {
          expect(response.success).to.be.false;
          expect(response.error).to.equal('Query was sent in incorrect format');
          sinon.assert.calledOnce(loggerInfoStub);
          sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: queryRaw});
          done();
        }
      });

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware');
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('assumes that dataset passed in urlon ddfql is encoded with encodeURIComponent', (done: Function) => {
      const ddfql = {
        from: 'entities',
        dataset: 'VS-work%2Fddf--ws-testing%23master-twin-for-e2e',
        select: {
          key: ['company']
        }
      };

      const queryRaw = URLON.stringify(ddfql);

      const req = mockReq({
        query: {},
        url: `/api/ddf/ql/?${queryRaw}`
      });

      const res = mockRes({});

      const loggerInfoStub = sandbox.stub(logger, 'info');

      const next = () => {
        expect(req.body.dataset).to.equal('VS-work/ddf--ws-testing#master-twin-for-e2e');
        sinon.assert.calledOnce(loggerInfoStub);
        sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: queryRaw});
        done();
      };

      routeUtils.bodyFromUrlQuery(req, res as express.Response, next);
    });

    it('assumes that dataset passed in urlon ddfql is encoded with encodeURIComponent: dataset value is coerced to string', (done: Function) => {
      const ddfql = {
        from: 'entities',
        dataset: 42,
        select: {
          key: ['company']
        }
      };

      const queryRaw = URLON.stringify(ddfql);

      const req = mockReq({
        query: {},
        url: `/api/ddf/ql/?${queryRaw}`
      });

      const res = mockRes({});

      const loggerInfoStub = sandbox.stub(logger, 'info');

      const next = () => {
        expect(req.body.dataset).to.equal('42');
        sinon.assert.calledOnce(loggerInfoStub);
        sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: queryRaw});
        done();
      };

      routeUtils.bodyFromUrlQuery(req, res as express.Response, next);
    });

    it('should respond with an error when it is impossible to decode dataset in urlon query with decodeURIComponent', (done: Function) => {
      const req = mockReq({
        query: '',
        url: '/api/ddf/ql/?_from=entities&dataset=%&select_key@=company'
      });

      const queryRaw = url.parse(req.url).query;

      const loggerInfoStub = sandbox.stub(logger, 'info');
      sandbox.stub(logger, 'error');

      const res = mockRes({
        json: (response) => {
          expect(response.success).to.be.false;
          expect(response.error).to.equal('Query was sent in incorrect format');
          sinon.assert.calledOnce(loggerInfoStub);
          sinon.assert.calledWithExactly(loggerInfoStub, {ddfqlRaw: queryRaw});
          done();
        }
      });

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware');
      };

      routeUtils.bodyFromUrlQuery(req as any, res as any, next);
    });
  });

  xdescribe('#token authentication', () => {

    afterEach(() => sandbox.restore());

    xit('should return token authentication middleware', () => {
      const req = mockReq({});
      const res = mockRes({});
      const next = () => {
      };
      const middleware = () => {
      };

      const tokenAuthSpy = sandbox.stub().returns(middleware);
      const passportAuthStub = sandbox.stub(passport, 'authenticate').callsFake(() => {
        return tokenAuthSpy;
      });

      // const tokenMiddleware = routeUtils.ensureAuthenticatedViaToken(req, res, next);

      // expect(tokenMiddleware).to.equal(middleware);

      sinon.assert.calledOnce(passportAuthStub);
      sinon.assert.calledWith(passportAuthStub, 'token');

      sinon.assert.calledOnce(tokenAuthSpy);
      sinon.assert.calledWith(tokenAuthSpy);
    });
  });

  describe('#response types', () => {
    const defaultContext: RequestTags = {
      url: '',
      queryParser: {
        query: '',
        queryType: ''
      },
      requestStartTime: 123
    };

    afterEach(() => sandbox.restore());

    it('should produce error response from string', () => {

      const loggerErrorStub = sandbox.stub(logger, 'error');

      const expectedError = {
        code: 999,
        message: 'Boo!',
        place: 'default',
        type: 'INTERNAL_SERVER_TEXT_ERROR'
      };

      const response = routeUtils.toErrorResponse(expectedError, defaultContext, 'test');

      expect(response.success).to.be.false;
      expect(response.error).to.equal(expectedError.message);

      sinon.assert.calledOnce(loggerErrorStub);
      sinon.assert.calledWithExactly(loggerErrorStub, expectedError);
    });

    it('should produce error response from Error', () => {
      const loggerErrorStub = sandbox.stub(logger, 'error');

      const expectedError = Error('Boo!');
      const response = routeUtils.toErrorResponse(expectedError, defaultContext, 'test');

      expect(response.success).to.be.false;
      expect(response.error).to.equal('Boo!');

      sinon.assert.calledOnce(loggerErrorStub);
      sinon.assert.calledWithExactly(loggerErrorStub, {
        code: 998,
        message: 'Boo!',
        place: 'test',
        type: 'INTERNAL_SERVER_ERROR'
      });
    });

    it('should produce message response', function () {
      const expectedMsg = 'Hello!';
      const response = routeUtils.toMessageResponse(expectedMsg);

      expect(response.success).to.be.true;
      expect(response.message).to.equal(expectedMsg);
    });

    it('should produce data response', function () {
      const expectedData = {foo: 'bar'};
      const response = routeUtils.toDataResponse(expectedData);

      expect(response.success).to.be.true;
      expect(response.data).to.equal(expectedData);
    });
  });

  describe('#bodyFromUrlAssets - Parses a request body based asset url requested. Populates the body with a dataset and a dataset_access_token', () => {

    afterEach(() => sandbox.restore());

    it(`doesn't handles routes that start not with ${constants.ASSETS_ROUTE_BASE_PATH}`, (done: Function) => {
      const req = mockReq({
        baseUrl: 'foo'
      });
      const res = mockRes({});

      routeUtils.bodyFromUrlAssets(req, res, () => {
        expect(_.size(req)).to.equal(12);
        expect(req.baseUrl).to.equal('foo');
        done();
      });
    });

    it(`fails when malformed url was given to the "assets" endpoint`, () => {
      const jsonSpy = sandbox.spy();
      const nextSpy = sandbox.spy();
      sandbox.stub(logger, 'error');

      const req = mockReq({
        originalUrl: `${constants.ASSETS_ROUTE_BASE_PATH}/%E0%A4%A`,
        baseUrl: constants.ASSETS_ROUTE_BASE_PATH
      });
      const res = mockRes({
        _status: -1,
        status(code: number): any {
          this._status = code;
          return this;
        },
        json: jsonSpy
      });

      routeUtils.bodyFromUrlAssets(req, res, nextSpy);

      expect(res._status).to.equal(200);
      sinon.assert.calledWith(jsonSpy, {success: false, error: 'Malformed url was given'});
      sinon.assert.notCalled(nextSpy);
    });

    it(`fails when given url contains relative path segments like "." or ".."`, () => {
      const jsonSpy = sandbox.spy();
      const nextSpy = sandbox.spy();
      sandbox.stub(logger, 'error');

      const req = mockReq({
        originalUrl: `${constants.ASSETS_ROUTE_BASE_PATH}/../foo/./bar/../baz.json`,
        baseUrl: constants.ASSETS_ROUTE_BASE_PATH
      });
      const res = mockRes({
        _status: -1,
        status(code: number): any {
          this._status = code;
          return this;
        },
        json: jsonSpy
      });

      routeUtils.bodyFromUrlAssets(req, res, nextSpy);

      expect(res._status).to.equal(200);
      sinon.assert.calledWith(jsonSpy, {
        success: false,
        error: 'You cannot use relative path constraints like "." or ".." in the asset path'
      });
      sinon.assert.notCalled(nextSpy);
    });

    it(`fails when asset was requested for the default dataset and dataset was not found`, (done: Function) => {
      const expectedError = 'Default dataset not found';

      const nextSpy = sandbox.spy();
      sandbox.stub(logger, 'error');

      sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, expectedError);

      const req = mockReq({
        originalUrl: `${constants.ASSETS_ROUTE_BASE_PATH}/default/assets/foo.json`,
        baseUrl: constants.ASSETS_ROUTE_BASE_PATH
      });
      const res = mockRes({
        _status: -1,
        status(code: number): any {
          this._status = code;
          return this;
        },
        json(body: any): any {
          // Assert
          expect(this._status).to.equal(200);
          expect(body).to.deep.equal({
            success: false,
            error: 'Default dataset couldn\'t be found'
          });
          sinon.assert.notCalled(nextSpy);
          done();
        }
      });

      routeUtils.bodyFromUrlAssets(req, res, nextSpy);
    });

    it(`fails when client is trying to access an asset under directory other then "assets"`, (done: Function) => {
      const expectedError = `You cannot access directories other than "${constants.ASSETS_EXPECTED_DIR}"`;

      const nextSpy = sandbox.spy();
      sandbox.stub(logger, 'error');

      const defaultDataset: any = {
        name: 'open-numbers/globalis#development'
      };

      sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, {dataset: defaultDataset});

      const req = mockReq({
        originalUrl: `${constants.ASSETS_ROUTE_BASE_PATH}/default/SECURED/foo.json`,
        baseUrl: constants.ASSETS_ROUTE_BASE_PATH
      });
      const res = mockRes({
        _status: -1,
        status(code: number): any {
          this._status = code;
          return this;
        },
        json(body: any): any {
          // Assert
          expect(this._status).to.equal(200);
          expect(body).to.deep.equal({
            success: false,
            error: expectedError
          });
          sinon.assert.notCalled(nextSpy);
          done();
        }
      });

      routeUtils.bodyFromUrlAssets(req, res, nextSpy);
    });

    it(`parses an asset request url in order to get an asset descriptor: default dataset on master branch has been requested`, (done: Function) => {
      const defaultDataset: any = {
        name: 'open-numbers/globalis'
      };

      sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, {dataset: defaultDataset});

      const req = mockReq({
        query: {
          dataset_access_token: 'foobar'
        },
        body: {},
        originalUrl: `${constants.ASSETS_ROUTE_BASE_PATH}/default/assets/foo.json`,
        baseUrl: constants.ASSETS_ROUTE_BASE_PATH
      });
      const res = mockRes({
        _status: -1,
        status(code: number): any {
          this._status = code;
          return this;
        }
      });

      routeUtils.bodyFromUrlAssets(req, res, () => {
        // Assert
        expect(res._status).to.equal(-1);
        expect(req.body.dataset).to.equal('open-numbers/globalis#master');
        expect(req.body.dataset_access_token).to.equal('foobar');
        expect(req.body.assetPathDescriptor).to.deep.equal({
          assetName: 'foo.json',
          assetsDir: 'assets',
          dataset: 'open-numbers/globalis#master',
          path: '/home/anonymous/repos/open-numbers/globalis/master/assets/foo.json'
        });

        done();
      });
    });

    it(`parses an asset request url in order to get an asset descriptor: custom dataset has been requested`, (done: Function) => {
      sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, 'don\'t care what kind of error is here in case of non default dataset asset request');

      const req = mockReq({
        query: {
          dataset_access_token: 'foobar'
        },
        body: {},
        originalUrl: `${constants.ASSETS_ROUTE_BASE_PATH}/myAccountOnGithub/my-custom-dataset/branch/feature/assets/foo2.json?dataset_access_token=foobar`,
        baseUrl: constants.ASSETS_ROUTE_BASE_PATH
      });
      const res = mockRes({
        _status: -1,
        status(code: number): any {
          this._status = code;
          return this;
        }
      });

      routeUtils.bodyFromUrlAssets(req, res, () => {
        // Assert
        expect(res._status).to.equal(-1);
        expect(req.body.dataset).to.equal('myAccountOnGithub/my-custom-dataset#branch/feature');
        expect(req.body.dataset_access_token).to.equal('foobar');
        expect(req.body.assetPathDescriptor).to.deep.equal({
          assetName: 'foo2.json',
          assetsDir: 'assets',
          dataset: 'myAccountOnGithub/my-custom-dataset#branch/feature',
          path: '/home/anonymous/repos/myAccountOnGithub/my-custom-dataset/branch/feature/assets/foo2.json'
        });

        done();
      });
    });
  });
});
