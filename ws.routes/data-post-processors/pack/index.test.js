import _ from 'lodash';
import test from 'ava';
import sinon from 'sinon';
import rewire from 'rewire';

const packMiddleware = rewire('./index');

let req, res;

test.beforeEach(() => {
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

test.cb('should respond with application/json content type when json format parameter was given', assert => {
  //arrange
  let packedData = [{
    "geo": "usa",
    "year": 2004,
    "gini": 42
  }];

  req.query.format ='json';

  let resMock = sinon.mock(res);
  resMock.expects('set').once().withArgs('Content-Type', 'application/json');
  resMock.expects('send').once().withArgs(packedData);

  packMiddleware.__set__('pack', (wsJson, formatType, cb) => {
    //assert
    assert.deepEqual(wsJson.wsJson, req.wsJson);
    assert.true(_.isEmpty(wsJson.rawDdf));

    cb(null, packedData);

    resMock.verify();
    assert.end();
  });

  //act
  packMiddleware(req, res);
});

test.cb('should respond with application/x-ws+json content type when wsJson format parameter was given', assert => {
  //arrange
  let packedData = {
    "headers": ["geo", "year", "gini"],
    "rows": [["usa", 2004, 42]]
  };

  req.query.format ='wsJson';

  let resMock = sinon.mock(res);
  resMock.expects('set').once().withArgs('Content-Type', 'application/x-ws+json');
  resMock.expects('send').once().withArgs(packedData);

  packMiddleware.__set__('pack', (wsJson, formatType, cb) => {
    //assert
    assert.deepEqual(wsJson.wsJson, req.wsJson);
    assert.true(_.isEmpty(wsJson.rawDdf));

    cb(null, packedData);

    resMock.verify();
    assert.end();
  });

  //act
  packMiddleware(req, res);
});

test.cb('should respond with application/x-ws+json content type when unknown format parameter was given', assert => {
  //arrange
  let packedData = {
    "headers": ["geo", "year", "gini"],
    "rows": [["usa", 2004, 42]]
  };

  req.query.format ='bla-unknown';

  let resMock = sinon.mock(res);
  resMock.expects('set').once().withArgs('Content-Type', 'application/x-ws+json');
  resMock.expects('send').once().withArgs(packedData);

  packMiddleware.__set__('pack', (wsJson, formatType, cb) => {
    assert.deepEqual(wsJson.wsJson, req.wsJson);
    assert.true(_.isEmpty(wsJson.rawDdf));

    cb(null, packedData);

    //assert
    resMock.verify();
    assert.end();
  });

  //act
  packMiddleware(req, res);
});

test.cb('should respond with text/csv content type when csv format parameter was given', assert => {
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
    assert.deepEqual(wsJson.wsJson, req.wsJson);
    assert.true(_.isEmpty(wsJson.rawDdf));

    cb(null, packedData);

    resMock.verify();
    assert.end();
  });

  //act
  packMiddleware(req, res);
});

test.cb('should respond with error when error occured and turn off redis cache', assert => {
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
    assert.is(res.use_express_redis_cache, false);
    resMock.verify();
    consoleMock.verify();
    assert.end();
  };
  packMiddleware.__set__('pack', format);

  //act
  packMiddleware(req, res);
});
