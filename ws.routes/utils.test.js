import test from 'ava';
import sinon from 'sinon';
import utils from './utils';

test('should decode incoming query and extend request object with a decodedQuery param', assert => {
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
    select:['geo', 'time', 'pop'],
    where: {
      geo:['ind','chn'],
      'geo.region':['afr', 'europe'],
      'geo.cat':['region', 'country'],
      time:[1800,[2000, 2010],2015]
    },
    sort: {geo: 'asc',time: 'desc'},
    gapfilling: {interpolation: 'log',extrapolation: 3}
  };

  let next = sinon.spy();

  //act
  utils.decodeQuery(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.deepEqual(req.decodedQuery, expected);
});

test('should decode incoming query sort param - "true" as value for property should be substituted with "asc"', assert => {
  //arrange
  let req = {
    query: {
      sort: 'geo,time:desc'
    }
  };

  let expected = {
    sort: {geo: 'asc',time: 'desc'}
  };

  //act
  utils.decodeQuery(req, null, assert => {});

  //assert
  assert.deepEqual(req.decodedQuery.sort, expected.sort);
});

test('should decode incoming query sort param - incoming sort request param will be sanitized (omit all invalid values)', assert => {
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
  utils.decodeQuery(req, null, assert => {});

  //assert
  assert.deepEqual(req.decodedQuery.sort, expected.sort);
});

test('should decode incoming query sort param - empty sort param will spawn empty object', assert => {
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
  utils.decodeQuery(req, null, assert => {});

  //assert
  assert.deepEqual(req.decodedQuery.sort, expected.sort);
});

test('should apply default values for decoded query and call next middleware', assert => {
  //arrange
  let req = {query: {}};
  let next = sinon.spy();

  //act
  utils.decodeQuery(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.truthy(req.decodedQuery);
  assert.deepEqual(req.decodedQuery.select, []);
});
