import test from 'ava';
import sinon from 'sinon';
import rewire from 'rewire';

const toPrecisionMiddleware = rewire('./index');

test('should process data with a given precision level and call next middleware', assert => {
  //arrange
  let req = {
    query: {
      precisionLevel: 10
    },
    wsJson: {
      headers: ['geo', 'year', 'gini'],
      rows: [
        ["usa", 2004, 42]
      ]
    }
  };

  let next = sinon.spy();

  toPrecisionMiddleware.__set__('toPrecision', (wsJsonRows, columns, precisionLevel) => {
    //assert
    assert.deepEqual(wsJsonRows, req.wsJson.rows);
    assert.is(columns, null);
    assert.is(precisionLevel, req.query.precisionLevel);
  });

  //act
  toPrecisionMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
});

test('should not process data when wsJson was not given but should call next middleware', assert => {
  //arrange
  let req = {
    wsJson: null
  };

  let next = sinon.spy();
  let toPrecision = sinon.spy();

  toPrecisionMiddleware.__set__('toPrecision', toPrecision);

  //act
  toPrecisionMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.is(toPrecision.called, false);
});

test('should not process data when wsJson was given with no rows but should call next middleware', assert => {
  //arrange
  let req = {
    wsJson: {
      rows: null
    }
  };

  let next = sinon.spy();
  let toPrecision = sinon.spy();

  toPrecisionMiddleware.__set__('toPrecision', toPrecision);

  //act
  toPrecisionMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.is(toPrecision.called, false);
});
