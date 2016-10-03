'use strict';

const _ = require('lodash');
const chai = require('chai');

const extrapolate = require('./../../../../ws.routes/data-post-processors/gapfilling/extrapolation.processor.js');

const expect = chai.expect;

describe('data post processors extrapolation', () => {
  it('should return empty result when input was empty', () => {
    //arrange
    const input = [];

    //act
    const actual = extrapolate(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should return input as is when there is nothing to extrapolate - only one row is given with null measure value', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3));

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should return input as is when there is nothing to extrapolate - all measure values are null', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        null
      ],
      [
        "usa",
        2005,
        null
      ],
      [
        "usa",
        2006,
        null
      ],
      [
        "usa",
        2007,
        null
      ],
      [
        "angola",
        2007,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3));

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should return input as is when column indexes to extrapolate were not given', () => {
    //arrange
    const input = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        null
      ],
      [
        'angola',
        2012,
        null
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    //act
    const actual = extrapolate(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should extrapolate measure values for a given range - only one existing value is available', () => {
    //arrange
    const input = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        null
      ],
      [
        'angola',
        2012,
        null
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        22.5
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        22.5
      ],
      [
        'angola',
        2012,
        null
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3));

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate measure values for a given range - few existing values are available', () => {
    //arrange
    const input = [
      [
        'angola',
        1997,
        null
      ],
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2001,
        null
      ],
      [
        'angola',
        2011,
        33.4
      ],
      [
        'angola',
        2012,
        null
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1997,
        null
      ],
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        22.5
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2001,
        null
      ],
      [
        'angola',
        2011,
        33.4
      ],
      [
        'angola',
        2012,
        33.4
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3));

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate few measures values for a given range - only one existing value is available', () => {
    //arrange
    const input = [
      [
        'angola',
        1997,
        null,
        null
      ],
      [
        'angola',
        1998,
        null,
        null
      ],
      [
        'angola',
        1999,
        null,
        42
      ],
      [
        'angola',
        2000,
        22.5,
        null
      ],
      [
        'angola',
        2001,
        null,
        null
      ],
      [
        'angola',
        2011,
        null,
        null
      ],
      [
        'angola',
        2012,
        null,
        null
      ],
      [
        'angola',
        2013,
        null,
        null
      ],
      [
        'angola',
        2014,
        null,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1997,
        null,
        null
      ],
      [
        'angola',
        1998,
        null,
        42
      ],
      [
        'angola',
        1999,
        22.5,
        42
      ],
      [
        'angola',
        2000,
        22.5,
        42
      ],
      [
        'angola',
        2001,
        22.5,
        null
      ],
      [
        'angola',
        2011,
        null,
        null
      ],
      [
        'angola',
        2012,
        null,
        null
      ],
      [
        'angola',
        2013,
        null,
        null
      ],
      [
        'angola',
        2014,
        null,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 4));

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate few measures values for a given range - few existing values are available', () => {
    //arrange
    const input = [
      [
        'angola',
        1997,
        null,
        null
      ],
      [
        'angola',
        1998,
        null,
        null
      ],
      [
        'angola',
        1999,
        null,
        42
      ],
      [
        'angola',
        2000,
        22.5,
        null
      ],
      [
        'angola',
        2001,
        null,
        null
      ],
      [
        'angola',
        2011,
        null,
        43
      ],
      [
        'angola',
        2012,
        null,
        null
      ],
      [
        'angola',
        2013,
        null,
        null
      ],
      [
        'angola',
        2014,
        null,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1997,
        null,
        null
      ],
      [
        'angola',
        1998,
        null,
        42
      ],
      [
        'angola',
        1999,
        22.5,
        42
      ],
      [
        'angola',
        2000,
        22.5,
        null
      ],
      [
        'angola',
        2001,
        22.5,
        null
      ],
      [
        'angola',
        2011,
        null,
        43
      ],
      [
        'angola',
        2012,
        null,
        43
      ],
      [
        'angola',
        2013,
        null,
        null
      ],
      [
        'angola',
        2014,
        null,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 4));

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate measure values for a given range - only one existing value is available, few countries', () => {
    //arrange
    const input = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        23
      ],
      [
        'usa',
        2011,
        null
      ],
      [
        'usa',
        2012,
        22
      ],
      [
        'usa',
        2013,
        null
      ],
      [
        'usa',
        2014,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        23
      ],
      [
        'angola',
        2000,
        23
      ],
      [
        'usa',
        2011,
        22
      ],
      [
        'usa',
        2012,
        22
      ],
      [
        'usa',
        2013,
        22
      ],
      [
        'usa',
        2014,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3));

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate measure values for a given range - only one existing value is available, few countries and years unordered', () => {
    //arrange
    const input = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        23
      ],
      [
        'usa',
        2011,
        null
      ],
      [
        'usa',
        2012,
        22
      ],
      [
        'usa',
        2013,
        null
      ],
      [
        'usa',
        2014,
        25
      ],
      [
        'usa',
        2015,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        23
      ],
      [
        'angola',
        2000,
        23
      ],
      [
        'usa',
        2011,
        22
      ],
      [
        'usa',
        2012,
        22
      ],
      [
        'usa',
        2013,
        null
      ],
      [
        'usa',
        2014,
        25
      ],
      [
        'usa',
        2015,
        25
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3));

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate measure values for a given range and given number of years', () => {
    //arrange
    const input = [
      [
        'angola',
        1997,
        null
      ],
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        null
      ],
      [
        'angola',
        2012,
        null
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1997,
        22.5
      ],
      [
        'angola',
        1998,
        22.5
      ],
      [
        'angola',
        1999,
        22.5
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        22.5
      ],
      [
        'angola',
        2012,
        22.5
      ],
      [
        'angola',
        2013,
        22.5
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3), {
      numOfYearsToExtrapolate: 3
    });

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should extrapolate measure values for a given range and given number of years - given number of years exceeds amount of data', () => {
    //arrange
    const input = [
      [
        'angola',
        1997,
        null
      ],
      [
        'angola',
        1998,
        null
      ],
      [
        'angola',
        1999,
        null
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        null
      ],
      [
        'angola',
        2012,
        null
      ],
      [
        'angola',
        2013,
        null
      ],
      [
        'angola',
        2014,
        null
      ]
    ];

    const expected = [
      [
        'angola',
        1997,
        22.5
      ],
      [
        'angola',
        1998,
        22.5
      ],
      [
        'angola',
        1999,
        22.5
      ],
      [
        'angola',
        2000,
        22.5
      ],
      [
        'angola',
        2011,
        22.5
      ],
      [
        'angola',
        2012,
        22.5
      ],
      [
        'angola',
        2013,
        22.5
      ],
      [
        'angola',
        2014,
        22.5
      ]
    ];

    //act
    const actual = extrapolate(input, _.range(2, 3), {
      numOfYearsToExtrapolate: 100
    });

    //assert
    expect(actual).to.deep.equal(expected);
  });
});
