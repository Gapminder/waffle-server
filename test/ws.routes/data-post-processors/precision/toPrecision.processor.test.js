'use strict';

const _ = require('lodash');
const chai = require('chai');
const toPrecision = require('../../../../ws.routes/data-post-processors/precision/toPrecision.processor');

const expect = chai.expect;

describe('data post processors precision', () => {
  it('should return input as is when undefined as input was given', () => {
    //act
    const actual = toPrecision(undefined);

    //assert
    expect(actual).to.equal(undefined);
  });

  it('should return input as is when null as input was given', () => {
    //act
    const actual = toPrecision(null);

    //assert
    expect(actual).to.equal(null);
  });

  it('should return empty array when empty array as input was given', () => {
    //act
    const actual = toPrecision([]);

    //assert
    expect(actual).to.deep.equal([]);
  });

  it('should spawn values with a given precision - one measure column given', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123
      ]
    ];

    const expected = [
      [
        "usa",
        2004,
        1.0021
      ],
      [
        "usa",
        2005,
        1.0021
      ],
      [
        "usa",
        2006,
        1.0021
      ],
      [
        "usa",
        2007,
        1.0021
      ],
      [
        "usa",
        2008,
        1.0021
      ],
      [
        "usa",
        2009,
        1.0021
      ],
      [
        "usa",
        2010,
        1.0021
      ]
    ];

    const precisionLevel = 4;
    const columnsToProcess = _.range(2, expected[0].length);

    //act
    const actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should spawn values with a given precision - few measure columns given', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123,
        1.00213123123
      ]
    ];

    const expected = [
      [
        "usa",
        2004,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2005,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2006,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2007,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2008,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2009,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2010,
        1.0021,
        1.0021
      ]
    ];

    const precisionLevel = 4;
    const columnsToProcess = _.range(2, expected[0].length);

    //act
    const actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should spawn values with a given precision - for given measure column only', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123,
        1.00213123123
      ]
    ];

    const expected = [
      [
        "usa",
        2004,
        1.0021,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.0021,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.0021,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.0021,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.0021,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.0021,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.0021,
        1.00213123123
      ]
    ];

    const precisionLevel = 4;
    const columnsToProcess = _.range(2, 3);

    //act
    const actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should return input as is, when not existing columns to process given', () => {
    //arrange
    const input = [
      [
        "usa",
        2004
      ],
      [
        "usa",
        2005
      ],
      [
        "usa",
        2006
      ],
      [
        "usa",
        2007
      ],
      [
        "usa",
        2008
      ],
      [
        "usa",
        2009
      ],
      [
        "usa",
        2010
      ]
    ];

    const precisionLevel = 4;
    const columnsToProcess = _.range(2, 3);

    //act
    const actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should return input as is if no precision level was given', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123
      ]
    ];

    const columnsToProcess = _.range(2, 3);

    //act
    const actual = toPrecision(input, columnsToProcess);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should spawn values with a given precision for all columns when columns to process were not given', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123,
        1.00213123123
      ]
    ];

    const expected = [
      [
        "usa",
        2004,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2005,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2006,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2007,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2008,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2009,
        1.0021,
        1.0021
      ],
      [
        "usa",
        2010,
        1.0021,
        1.0021
      ]
    ];

    const precisionLevel = 4;

    //act
    const actual = toPrecision(input, null, precisionLevel);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should return input as is when given precision level cannot be parsed as a number', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123,
        1.00213123123
      ]
    ];

    const precisionLevel = 'bla';

    //act
    const actual = toPrecision(input, null, precisionLevel);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should return input with 0 precision level when given level is less than 0', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123,
        1.00213123123
      ]
    ];

    const expected = [
      [
        "usa",
        2004,
        1,
        1
      ],
      [
        "usa",
        2005,
        1,
        1
      ],
      [
        "usa",
        2006,
        1,
        1
      ],
      [
        "usa",
        2007,
        1,
        1
      ],
      [
        "usa",
        2008,
        1,
        1
      ],
      [
        "usa",
        2009,
        1,
        1
      ],
      [
        "usa",
        2010,
        1,
        1
      ]
    ];

    const precisionLevel = -42;

    //act
    const actual = toPrecision(input, null, precisionLevel);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should return input with 15 precision level when given level is more than 15', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2005,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2006,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2007,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2008,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2009,
        1.00213123123,
        1.00213123123
      ],
      [
        "usa",
        2010,
        1.00213123123,
        1.00213123123
      ]
    ];

    const precisionLevel = 16;

    //act
    const actual = toPrecision(input, null, precisionLevel);

    //assert
    expect(actual).to.deep.equal(input);
  });
});
