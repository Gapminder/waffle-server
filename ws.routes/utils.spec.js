'use strict';

const sinon = require('sinon');
const assert = require('assert');
const utils = require('./utils');

describe('decodeQuery-middleware', () => {
  it('should decode incoming query and extend request object with a decodedQuery param', () => {
    //arrange
    let req = {
      query: {
        select: 'geo,time,pop',
        geo: 'ind,chn',
        'geo.region': 'afr,europe',
        'geo.cat': 'region,country',
        time: '1800,2000:2010,2015',
        gapfilling: 'interpolation:log,extrapolation:3'
      }
    };

    let expected = {
      select:['geo', 'time', 'pop'],
      where: {
        geo:['ind','chn'],
        'geo.region':['afr', 'europe'],
        'geo.cat':['region', 'country'],
        time:[1800,[2000, 2010],2015]
      },
      gapfilling: {interpolation: 'log',extrapolation: 3}
    };

    let next = sinon.spy();

    //act
    utils.decodeQuery(req, null, next);

    //assert
    assert.ok(next.calledOnce);
    assert.deepEqual(req.decodedQuery, expected);
  });

  it('should apply default values for decoded query and call next middleware', () => {
    //arrange
    let req = {query: {}};
    let next = sinon.spy();

    //act
    utils.decodeQuery(req, null, next);

    //assert
    assert.ok(next.calledOnce);
    assert.ok(req.decodedQuery);
    assert.deepEqual(req.decodedQuery.select, ['geo','geo.name','geo.cat','geo.region']);
    assert.deepEqual(req.decodedQuery.where['geo.cat'], ['geo']);
  });
});
