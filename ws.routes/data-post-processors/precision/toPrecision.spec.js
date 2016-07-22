'use strict';

const sinon = require('sinon');
const assert = require('assert');
const toPrecisionMiddleware = require('rewire')('./index');

describe('toPrecision-middleware', () => {
  it('should process data with a given precision level and call next middleware', () => {
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
      assert.strictEqual(columns, null);
      assert.strictEqual(precisionLevel, req.query.precisionLevel);
    });

    //act
    toPrecisionMiddleware(req, null, next);

    //assert
    assert.ok(next.calledOnce);
  });

  it('should not process data when wsJson was not given but should call next middleware', () => {
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
    assert.ok(next.calledOnce);
    assert.strictEqual(toPrecision.called, false);
  });

  it('should not process data when wsJson was given with no rows but should call next middleware', () => {
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
    assert.ok(next.calledOnce);
    assert.strictEqual(toPrecision.called, false);
  });
});
