'use strict';

const sinon = require('sinon');
const assert = require('assert');
const packMiddleware = require('rewire')('./index');

describe('pack-middleware', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        format: 'json'
      },
      wsJson: {
        headers: ['geo', 'year', 'gini'],
        rows: [
          ["usa", 2004, 42]
        ]
      }
    };

    res = {
      use_express_redis_cache: true,
      set: () => {},
      send: () => {},
      json: () => {}
    };
  });

  it('should respond with application/json content type when json format parameter was given', (done) => {
    //arrange
    let packedData = [{
      "geo": "usa",
      "year": 2004,
      "gini": 42
    }];

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'application/json');
    resMock.expects('send').once().withArgs(packedData);

    packMiddleware.__set__('pack', (wsJson, formatType, cb) => {
      //assert
      assert.deepEqual(wsJson, req.wsJson);

      cb(null, packedData);

      resMock.verify();
      done();
    });

    //act
    packMiddleware(req, res);
  });

  it('should respond with application/json content type when unknown format parameter was given', (done) => {
    //arrange
    let packedData = [{
      "geo": "usa",
      "year": 2004,
      "gini": 42
    }];

    req.query.format ='bla-unknown';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'application/json');
    resMock.expects('send').once().withArgs(packedData);

    packMiddleware.__set__('pack', (wsJson, formatType, cb) => {
      assert.deepEqual(wsJson, req.wsJson);

      cb(null, packedData);

      //assert
      resMock.verify();
      done();
    });

    //act
    packMiddleware(req, res);
  });

  it('should respond with text/csv content type when csv format parameter was given', (done) => {
    //arrange
    let packedData = [
      '"geo","year","gini"',
      '"usa",2004,42'
    ].join('\n');

    req.query.format ='csv';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'text/csv');
    resMock.expects('send').once().withArgs(packedData);

    packMiddleware.__set__('pack', (wsJson, formatType, cb) => {
      //assert
      assert.deepEqual(wsJson, req.wsJson);

      cb(null, packedData);

      resMock.verify();
      done();
    });

    //act
    packMiddleware(req, res);
  });

  it('should respond with error when error occured and turn off redis cache', (done) => {
    //arrange
    let error = {message: 'Crash!!!'};

    let resMock = sinon.mock(res);
    resMock.expects('send').never();
    resMock.expects('json').once().withArgs({success: false, error: error});

    let consoleObj =  {
        error: () => {}
    };
    let consoleMock = sinon.mock(consoleObj).expects('error').once().withArgs(error);
    packMiddleware.__set__('console', consoleObj);

    let format = (wsJson, formatType, cb) => {
      cb(error);

      //assert
      assert.strictEqual(res.use_express_redis_cache, false);
      resMock.verify();
      consoleMock.verify();
      done();
    };
    packMiddleware.__set__('pack', format);

    //act
    packMiddleware(req, res);
  });
});
