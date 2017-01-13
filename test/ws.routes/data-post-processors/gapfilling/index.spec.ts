import * as sinon from 'sinon';
import * as proxyquire from 'proxyquire';
import {expect} from 'chai';

const gapfillingProcessorPath = '../../../../ws.routes/data-post-processors/gapfilling/index';

describe('data post processors gapfilling middleware', () => {
  it('should not process data when wsJson was not given but should call next middleware', () => {

    //arrange
    let req = {
      wsJson: null
    };

    let next = sinon.spy();

    let interpolate = sinon.spy();
    let extrapolate = sinon.spy();
    let expandYears = sinon.spy();

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
      './yearsExpander.processor': {expandYears}
    }).gapfillingMiddleware;

    //act
    gapfillingMiddleware(req, null, next);

    //assert
    expect(next.calledOnce).to.be.ok;
    expect(interpolate.called).to.equal(false);
    expect(extrapolate.called).to.equal(false);
    expect(expandYears.called).to.equal(false);
  });

  it('should not process data when wsJson was given with no rows but should call next middleware', () => {
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

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
      './yearsExpander.processor': {expandYears}
    }).gapfillingMiddleware;

    //act
    gapfillingMiddleware(req, null, next);

    //assert
    expect(next.calledOnce).to.be.ok;
    expect(interpolate.called).to.equal(false);
    expect(extrapolate.called).to.equal(false);
    expect(expandYears.called).to.equal(false);
  });

  it('should not process data when gapfilling param was not given, though it should call next middleware', () => {
    //arrange
    let req = {
      decodedQuery: {},
      wsJson: {
        headers: [
          'geo',
          'time',
          'gini',
          'pop'
        ],
        rows: [
          [
            "usa",
            2004,
            null,
            null
          ],
          [
            "usa",
            2005,
            74.0,
            null
          ],
          [
            "usa",
            2006,
            null,
            null
          ],
          [
            "usa",
            2007,
            null,
            42
          ],
          [
            "usa",
            2008,
            null,
            null
          ],
          [
            "usa",
            2009,
            80.3,
            null
          ],
          [
            "usa",
            2010,
            null,
            null
          ]
        ]
      }
    };

    let next = sinon.spy();

    let interpolate = sinon.spy();
    let extrapolate = sinon.spy();
    let expandYears = sinon.spy();

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
      './yearsExpander.processor': {expandYears}
    }).gapfillingMiddleware;

    //act
    gapfillingMiddleware(req, null, next);

    //assert
    expect(next.calledOnce).to.be.ok;
    expect(interpolate.called).to.equal(false);
    expect(extrapolate.called).to.equal(false);
    expect(expandYears.called).to.equal(false);
  });

  it('should interpolate data', () => {
    //arrange
    let req = {
      decodedQuery: {
        gapfilling: {
          interpolation: true
        }
      },
      wsJson: {
        headers: [
          'geo',
          'time',
          'gini',
          'pop'
        ],
        rows: [
          [
            "usa",
            2004,
            null,
            null
          ]
        ]
      }
    };

    let options = {
      numOfYearsToExtrapolate: (req.decodedQuery.gapfilling as any).extrapolation,
      geoColumnIndex: 0,
      yearColumnIndex: 1
    };

    let next = sinon.spy();
    let extrapolate = sinon.spy();
    let interpolate = sinon.mock();
    interpolate.once().withArgs(req.wsJson.rows, [
      2,
      3
    ], options);

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
    }).gapfillingMiddleware;

    //act
    gapfillingMiddleware(req, null, next);

    //assert
    interpolate.verify();
    expect(next.calledOnce).to.be.ok;
    expect(extrapolate.called).to.equal(false);
  });

  it('should extrapolate data', () => {
    //arrange
    let req = {
      decodedQuery: {
        gapfilling: {
          extrapolation: 1
        }
      },
      wsJson: {
        headers: [
          'geo',
          'time',
          'gini',
          'pop'
        ],
        rows: [
          [
            "usa",
            2004,
            null,
            null
          ]
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
    extrapolate.once().withArgs(req.wsJson.rows, [
      2,
      3
    ], options);

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
    }).gapfillingMiddleware;
    //act
    gapfillingMiddleware(req, null, next);

    //assert
    expect(next.calledOnce).to.be.ok;
    expect(interpolate.called).to.equal(false);
    extrapolate.verify();
  });

  it('should extrapolate and interpolate data', () => {
    //arrange
    let req = {
      decodedQuery: {
        gapfilling: {
          interpolation: true,
          extrapolation: 1
        }
      },
      wsJson: {
        headers: [
          'geo',
          'time',
          'gini',
          'pop'
        ],
        rows: [
          [
            "usa",
            2004,
            null,
            null
          ]
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
    interpolate.once().withArgs(req.wsJson.rows, [
      2,
      3
    ], options).returns(req.wsJson.rows);

    let extrapolate = sinon.mock();
    extrapolate.once().withArgs(req.wsJson.rows, [
      2,
      3
    ], options).returns(req.wsJson.rows);

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
    }).gapfillingMiddleware;

    //act
    gapfillingMiddleware(req, null, next);

    //assert
    expect(next.calledOnce).to.be.ok;
    interpolate.verify();
    extrapolate.verify();
  });

  it('should expand years extrapolate and interpolate data', () => {
    //arrange
    let req = {
      decodedQuery: {
        gapfilling: {
          interpolation: true,
          extrapolation: 1
        },
        where: {
          time: [
            [
              2000,
              2005
            ]
          ]
        }
      },
      wsJson: {
        headers: [
          'geo',
          'time',
          'gini',
          'pop'
        ],
        rows: [
          [
            "usa",
            2004,
            null,
            null
          ]
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
    interpolate.once().withArgs(req.wsJson.rows, [
      2,
      3
    ], options).returns(req.wsJson.rows);

    let extrapolate = sinon.mock();
    extrapolate.once().withArgs(req.wsJson.rows, [
      2,
      3
    ], options).returns(req.wsJson.rows);

    let expandYears = sinon.mock();
    expandYears.once().withArgs(req.wsJson.rows, {from: 2000, to: 2005}).returns(req.wsJson.rows);

    const gapfillingMiddleware = proxyquire(gapfillingProcessorPath, {
      './interpolation.processor': {interpolate},
      './extrapolation.processor': {extrapolate},
      './yearsExpander.processor': {expandYears}
    }).gapfillingMiddleware;

    //act
    gapfillingMiddleware(req, null, next);

    //assert
    expect(next.calledOnce).to.be.ok;
    interpolate.verify();
    extrapolate.verify();
    expandYears.verify();
  });
});
