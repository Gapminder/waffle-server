'use strict';

require('../../ws.config/db.config');
require('../../ws.repository');
const _ = require('lodash');
const md5 = require('md5');
const url = require('url');
const URLON = require('URLON');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('chai').expect;

describe('Routes utils', () => {
  describe('Dataset accessibility check', () => {
    it('should send unsuccessful response with an error happened during dataset searching', done => {
      const errorMessage = 'Searching error!';
      const expectedDatasetName = 'fake/dataset';

      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            expect(datasetName).to.equal(expectedDatasetName);
            onFound(errorMessage);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: response => {
          expect(response).to.be.deep.equal({success: false, error: errorMessage});
          done(); // At this point test is finished
        }
      };

      const next = () => {
        expect.fail(null, null, 'This function should not be called');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should call next middleware if no dataset name was found', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const req = {};

      const res = 'any';

      const next = () => {
        done(); // At this point test is finished
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with error when dataset was not found', done => {
      const expectedDatasetName = 'fake/dataset';

      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            onFound(null);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: response => {
          expect(response).to.be.deep.equal({success: false, message: `Dataset with given name ${expectedDatasetName} was not found`});
          done(); // At this point test is finished
        }
      };

      const next = () => {
        expect.fail(null, null, 'This function should not be called');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should call next middleware when dataset is not private', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: false
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = 'any';

      const next = () => {
        done();
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should call next middleware when provided dataset access token matches token stored in dataset', done => {
      const expectedDatasetName = 'fake/dataset';
      const datasetAccessToken = 'aaaaabbbbbcccccddddd';

      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: datasetAccessToken
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset_access_token: datasetAccessToken,
          dataset: expectedDatasetName
        }
      };

      const res = 'any';

      const next = () => {
        done();
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with an error when user tries to access private dataset without access token', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: 'aaaaabbbbbcccccddddd'
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: (response) => {
          expect(response).to.deep.equal({success: false, error: 'You are not allowed to access data according to given query'});
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware when token is not provided');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with an error when user tries to access private dataset with wrong token', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: 'aaaaabbbbbcccccddddd'
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset_access_token: 'some fake token',
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: (response) => {
          expect(response).to.deep.equal({success: false, error: 'You are not allowed to access data according to given query'});
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware when token is not provided');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with an error when user tries to access private dataset - dataset.accessToken and dataset_access_token are empty', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: null
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset_access_token: null,
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: (response) => {
          expect(response).to.deep.equal({success: false, error: 'You are not allowed to access data according to given query'});
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware when token is not provided');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });
  });

  describe('Cache config', () => {
    it('should generate correct cache key', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const expectedCachePrefix = 'MyPrefix';
      const expectedMethod = 'GET';

      const req = {
        query: {},
        body: {bla: 42},
        method: expectedMethod,
        url: '/status?name=ryan'
      };

      const parsedUrl = url.parse(req.url);
      const md5Payload = md5(parsedUrl.query + JSON.stringify(req.body));
      const expectedCacheKey = `${expectedCachePrefix}-${req.method}-${parsedUrl.pathname}-${md5Payload}`;

      const res = {
        express_redis_cache_name: null
      };

      const next = () => {
        expect(res.express_redis_cache_name).to.equal(expectedCacheKey);
        done();
      };

      routeUtils.getCacheConfig(expectedCachePrefix)(req, res, next);
    });

    it('should use default cache key prefix if it was not provided', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const expectedCachePrefix = 'PREFIX_NOT_SET';
      const expectedMethod = 'GET';

      const req = {
        query: {},
        body: {bla: 42},
        method: expectedMethod,
        url: '/status?name=ryan'
      };

      const parsedUrl = url.parse(req.url);
      const md5Payload = md5(parsedUrl.query + JSON.stringify(req.body));
      const expectedCacheKey = `${expectedCachePrefix}-${req.method}-${parsedUrl.pathname}-${md5Payload}`;

      const res = {
        express_redis_cache_name: null
      };

      const next = () => {
        expect(res.express_redis_cache_name).to.equal(expectedCacheKey);
        done();
      };

      routeUtils.getCacheConfig()(req, res, next);
    });

    it('should invalidate redis cache if force option is provided', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const req = {
        query: {force: 'true'},
      };

      const res = {
        use_express_redis_cache: null
      };

      const next = () => {
        expect(res.use_express_redis_cache).to.be.false;
        done();
      };

      routeUtils.getCacheConfig()(req, res, next);
    });
  });

  describe('Parse query from url and populate request body with a result', () => {
    it('should parse query as json if "query" param given in url', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const ddfql = {
        "from": "entities",
        "select": {
          "key": ["company"]
        }
      };

      const queryRaw = encodeURIComponent(JSON.stringify(ddfql));

      const req = {
        query: {
          query: queryRaw
        },
      };

      const res = {

      };

      const next = () => {
        const rawDdfQuery = {queryRaw: queryRaw, type: 'JSON'};
        const expectedBody = _.extend({rawDdfQuery}, ddfql);
        expect(req.body).to.deep.equal(expectedBody);
        done();
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('should respond with an error when it is impossible to parse json', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const req = {
        query: {
          query: "bla"
        },
      };

      const res = {
        json: response => {
          expect(response.success).to.be.false;
          expect(response.error).to.equal('Query was sent in incorrect format');
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware');
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('should parse query as urlon if "query" param is not given in url', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const ddfql = {
        "from": "entities",
        "select": {
          "key": ["company"]
        }
      };

      const queryRaw = URLON.stringify(ddfql);

      const req = {
        query: {},
        url: `/api/ddf/ql/?${queryRaw}`
      };

      const res = {
      };

      const next = () => {
        const rawDdfQuery = {queryRaw, type: 'URLON'};
        const expectedBody = _.extend({rawDdfQuery}, ddfql);
        expect(req.body).to.deep.equal(expectedBody);
        done();
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });

    it('should respond with an error when it is impossible to parse urlon', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const req = {
        query: {},
        url: '/api/ddf/ql/?%20%'
      };

      const res = {
        json: response => {
          expect(response.success).to.be.false;
          expect(response.error).to.equal('Query was sent in incorrect format');
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware');
      };

      routeUtils.bodyFromUrlQuery(req, res, next);
    });
  });
});
