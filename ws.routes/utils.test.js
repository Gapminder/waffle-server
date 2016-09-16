'use strict';

const sinon = require('sinon');
const chai = require('chai');
const utils = require('./utils');

const expect = chai.expect;

it('should decode incoming query and extend request object with a decodedQuery param', () => {
  //arrange
  let req = {
    query: {
      select: 'geo,time,pop',
      geo: 'ind,chn',
      'geo.region': 'afr,europe',
      'geo.cat': 'region,country',
      time: '1800,2000:2010,2015',
      gapfilling: 'interpolation:log,extrapolation:3',
      sort: 'geo:asc,time:desc'
    }
  };

  let expected = {
    select: ['geo', 'time', 'pop'],
    where: {
      geo: ['ind', 'chn'],
      'geo.region': ['afr', 'europe'],
      'geo.cat': ['region', 'country'],
      time: [1800, [2000, 2010], 2015]
    },
    sort: {geo: 'asc', time: 'desc'},
    gapfilling: {interpolation: 'log', extrapolation: 3}
  };

  let next = sinon.spy();

  //act
  utils.decodeQuery(req, null, next);

  //assert
  expect(next.calledOnce).to.be.ok;
  expect(req.decodedQuery).to.deep.equal(expected);
});

it('should decode incoming query sort param - "true" as value for property should be substituted with "asc"', () => {
  //arrange
  let req = {
    query: {
      sort: 'geo,time:desc'
    }
  };

  let expected = {
    sort: {geo: 'asc', time: 'desc'}
  };

  //act
  utils.decodeQuery(req, null, () => {
  });

  //assert
  expect(req.decodedQuery.sort).to.deep.equal(expected.sort);
});

it('should decode incoming query sort param - incoming sort request param will be sanitized (omit all invalid values)', () => {
  //arrange
  let req = {
    query: {
      sort: 'geo:bla-bla-bla,some:true,time:desc'
    }
  };

  let expected = {
    sort: {time: 'desc'}
  };

  //act
  utils.decodeQuery(req, null, () => {
  });

  //assert
  expect(req.decodedQuery.sort).to.deep.equal(expected.sort);
});

it('should decode incoming query sort param - empty sort param will spawn empty object', () => {
  //arrange
  let req = {
    query: {
      sort: ''
    }
  };

  let expected = {
    sort: {}
  };

  //act
  utils.decodeQuery(req, null, () => {
  });

  //assert
  expect(req.decodedQuery.sort).to.deep.equal(expected.sort);
});

it('should apply default values for decoded query and call next middleware', () => {
  //arrange
  let req = {query: {}};
  let next = sinon.spy();

  //act
  utils.decodeQuery(req, null, next);

  //assert
  expect(next.calledOnce).to.be.ok;
  expect(req.decodedQuery).to.be.ok;
  expect(req.decodedQuery.select).to.deep.equal([]);
});
