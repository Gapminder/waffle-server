'use strict';

const sinon = require('sinon');
const chai = require('chai');
const proxyquire = require('proxyquire');

const expect = chai.expect;

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

  const toPrecisionMiddleware = proxyquire('./index', {
    './toPrecision.processor': (wsJsonRows, columns, precisionLevel) => {
      //assert
      expect(wsJsonRows).to.deep.equal(req.wsJson.rows);
      expect(columns).to.equal(null);
      expect(precisionLevel).to.equal(req.query.precisionLevel);
    }
  });

  //act
  toPrecisionMiddleware(req, null, next);

  //assert
  expect(next.calledOnce).to.be.ok;
});

it('should not process data when wsJson was not given but should call next middleware', () => {
  //arrange
  let req = {
    wsJson: null
  };

  let next = sinon.spy();
  let toPrecision = sinon.spy();

  const toPrecisionMiddleware = proxyquire('./index', {
    './toPrecision.processor': toPrecision
  });

  //act
  toPrecisionMiddleware(req, null, next);

  //assert
  expect(next.calledOnce).to.be.ok;
  expect(toPrecision.called).to.equal(false);
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

  const toPrecisionMiddleware = proxyquire('./index', {
    './toPrecision.processor': toPrecision
  });

  //act
  toPrecisionMiddleware(req, null, next);

  //assert
  expect(next.calledOnce).to.be.ok;
  expect(toPrecision.called).to.equal(false);
});
