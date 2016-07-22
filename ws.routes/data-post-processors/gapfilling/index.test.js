import test from 'ava';
import sinon from 'sinon';
import rewire from 'rewire';

const gapfillingMiddleware = rewire('./index');

test('should not process data when wsJson was not given but should call next middleware', assert => {
  //arrange
  let req = {
    wsJson: null
  };

  let next = sinon.spy();

  let interpolate = sinon.spy();
  let extrapolate = sinon.spy();
  let expandYears = sinon.spy();

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);
  gapfillingMiddleware.__set__('expandYears', expandYears);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.is(interpolate.called, false);
  assert.is(extrapolate.called, false);
  assert.is(expandYears.called, false);
});

test('should not process data when wsJson was given with no rows but should call next middleware', assert => {
  //arrange
  let req = {
    wsJson: {
      rows: null
    }
  };

  let next = sinon.spy();

  let interpolate = sinon.spy();
  let extrapolate = sinon.spy();
  let expandYears = sinon.spy();

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);
  gapfillingMiddleware.__set__('expandYears', expandYears);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.is(interpolate.called, false);
  assert.is(extrapolate.called, false);
  assert.is(expandYears.called, false);
});

test('should not process data when gapfilling param was not given, though it should call next middleware', assert => {
  //arrange
  let req = {
    decodedQuery: {},
    wsJson: {
      headers: ['geo', 'time', 'gini', 'pop'],
      rows: [
        ["usa", 2004, null, null],
        ["usa", 2005, 74.0, null],
        ["usa", 2006, null, null],
        ["usa", 2007, null, 42],
        ["usa", 2008, null, null],
        ["usa", 2009, 80.3, null],
        ["usa", 2010, null, null]
      ]
    }
  };

  let next = sinon.spy();

  let interpolate = sinon.spy();
  let extrapolate = sinon.spy();
  let expandYears = sinon.spy();

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);
  gapfillingMiddleware.__set__('expandYears', expandYears);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.is(interpolate.called, false);
  assert.is(extrapolate.called, false);
  assert.is(expandYears.called, false);
});

test('should interpolate data', assert => {
  //arrange
  let req = {
    decodedQuery: {
      gapfilling: {
        interpolation: true
      }
    },
    wsJson: {
      headers: ['geo', 'time', 'gini', 'pop'],
      rows: [
        ["usa", 2004, null, null]
      ]
    }
  };

  let options = {
    numOfYearsToExtrapolate: req.decodedQuery.gapfilling.extrapolation,
    geoColumnIndex: 0,
    yearColumnIndex: 1
  };

  let next = sinon.spy();
  let extrapolate = sinon.spy();
  let interpolate = sinon.mock();
  interpolate.once().withArgs(req.wsJson.rows, [2, 3], options);

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  interpolate.verify();
  assert.truthy(next.calledOnce);
  assert.is(extrapolate.called, false);
});

test('should extrapolate data', assert => {
  //arrange
  let req = {
    decodedQuery: {
      gapfilling: {
        extrapolation: 1
      }
    },
    wsJson: {
      headers: ['geo', 'time', 'gini', 'pop'],
      rows: [
        ["usa", 2004, null, null]
      ]
    }
  };

  let options = {
    numOfYearsToExtrapolate: req.decodedQuery.gapfilling.extrapolation,
    geoColumnIndex: 0,
    yearColumnIndex: 1
  };

  let next = sinon.spy();
  let interpolate = sinon.spy();
  let extrapolate = sinon.mock();
  extrapolate.once().withArgs(req.wsJson.rows, [2, 3], options);

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  assert.is(interpolate.called, false);
  extrapolate.verify();
});

test('should extrapolate and interpolate data', assert => {
  //arrange
  let req = {
    decodedQuery: {
      gapfilling: {
        interpolation: true,
        extrapolation: 1
      }
    },
    wsJson: {
      headers: ['geo', 'time', 'gini', 'pop'],
      rows: [
        ["usa", 2004, null, null]
      ]
    }
  };

  let options = {
    numOfYearsToExtrapolate: req.decodedQuery.gapfilling.extrapolation,
    geoColumnIndex: 0,
    yearColumnIndex: 1
  };

  let next = sinon.spy();
  let interpolate = sinon.mock();
  interpolate.once().withArgs(req.wsJson.rows, [2, 3], options).returns(req.wsJson.rows);

  let extrapolate = sinon.mock();
  extrapolate.once().withArgs(req.wsJson.rows, [2, 3], options).returns(req.wsJson.rows);

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  interpolate.verify();
  extrapolate.verify();
});

test('should expand years extrapolate and interpolate data', assert => {
  //arrange
  let req = {
    decodedQuery: {
      gapfilling: {
        interpolation: true,
        extrapolation: 1
      },
      where: {
        time: [[2000, 2005]]
      }
    },
    wsJson: {
      headers: ['geo', 'time', 'gini', 'pop'],
      rows: [
        ["usa", 2004, null, null]
      ]
    }
  };

  let options = {
    numOfYearsToExtrapolate: req.decodedQuery.gapfilling.extrapolation,
    geoColumnIndex: 0,
    yearColumnIndex: 1
  };

  let next = sinon.spy();

  let interpolate = sinon.mock();
  interpolate.once().withArgs(req.wsJson.rows, [2, 3], options).returns(req.wsJson.rows);

  let extrapolate = sinon.mock();
  extrapolate.once().withArgs(req.wsJson.rows, [2, 3], options).returns(req.wsJson.rows);

  let expandYears = sinon.mock();
  expandYears.once().withArgs(req.wsJson.rows, {from: 2000, to: 2005}).returns(req.wsJson.rows);

  gapfillingMiddleware.__set__('interpolate', interpolate);
  gapfillingMiddleware.__set__('extrapolate', extrapolate);
  gapfillingMiddleware.__set__('expandYears', expandYears);

  //act
  gapfillingMiddleware(req, null, next);

  //assert
  assert.truthy(next.calledOnce);
  interpolate.verify();
  extrapolate.verify();
  expandYears.verify();
});
