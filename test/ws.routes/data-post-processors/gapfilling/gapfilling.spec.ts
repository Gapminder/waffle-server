import * as _ from 'lodash';
import {expect} from 'chai';
import {interpolate} from '../../../../ws.routes/data-post-processors/gapfilling/interpolation.processor';
import {extrapolate} from '../../../../ws.routes/data-post-processors/gapfilling/extrapolation.processor';
import {expandYears} from '../../../../ws.routes/data-post-processors/gapfilling/yearsExpander.processor';

describe('data post processors gapfilling', () => {
  it('should interpolate and extrapolate measure values for a given range - only one measure used', () => {
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
        74.0
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
        "usa",
        2008,
        null
      ],
      [
        "usa",
        2009,
        80.3
      ],
      [
        "usa",
        2010,
        null
      ]
    ];

    const expected = [
      [
        "usa",
        2004,
        74.0
      ],
      [
        "usa",
        2005,
        74.0
      ],
      [
        "usa",
        2006,
        75.6
      ],
      [
        "usa",
        2007,
        77.2
      ],
      [
        "usa",
        2008,
        78.7
      ],
      [
        "usa",
        2009,
        80.3
      ],
      [
        "usa",
        2010,
        80.3
      ]
    ];

    //act
    const measureColumnIndexes = _.range(2, 3);
    let actual = interpolate(input, measureColumnIndexes);
    actual = extrapolate(actual, measureColumnIndexes);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should interpolate and extrapolate measures values for a given range', () => {
    //arrange
    const input = [
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
    ];

    const expected = [
      [
        "usa",
        2004,
        74.0,
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
        75.6,
        42
      ],
      [
        "usa",
        2007,
        77.2,
        42
      ],
      [
        "usa",
        2008,
        78.7,
        42
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
        80.3,
        null
      ]
    ];

    //act
    const measureColumnIndexes = _.range(2, 4);
    let actual = interpolate(input, measureColumnIndexes);
    actual = extrapolate(actual, measureColumnIndexes);

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should expand input data with years according to the given range', () => {
    //arrange
    const input = [
      [
        "usa",
        2004,
        71.7
      ],
      [
        "usa",
        2005,
        74.0
      ],
      [
        "usa",
        2006,
        75.6
      ],
      [
        "usa",
        2007,
        81.9
      ],
      [
        "angola",
        2007,
        81.9
      ]
    ];

    const expected = [
      [
        'usa',
        2000,
        null
      ],
      [
        'usa',
        2001,
        null
      ],
      [
        'usa',
        2002,
        null
      ],
      [
        'usa',
        2003,
        null
      ],
      [
        'usa',
        2004,
        71.7
      ],
      [
        'usa',
        2005,
        74
      ],
      [
        'usa',
        2006,
        75.6
      ],
      [
        'usa',
        2007,
        81.9
      ],
      [
        'usa',
        2008,
        null
      ],
      [
        'usa',
        2009,
        null
      ],
      [
        'usa',
        2010,
        null
      ],
      [
        'angola',
        2000,
        null
      ],
      [
        'angola',
        2001,
        null
      ],
      [
        'angola',
        2002,
        null
      ],
      [
        'angola',
        2003,
        null
      ],
      [
        'angola',
        2004,
        null
      ],
      [
        'angola',
        2005,
        null
      ],
      [
        'angola',
        2006,
        null
      ],
      [
        'angola',
        2007,
        81.9
      ],
      [
        'angola',
        2008,
        null
      ],
      [
        'angola',
        2009,
        null
      ],
      [
        'angola',
        2010,
        null
      ]
    ];

    //act
    const actual = expandYears(input, {
      from: 2000,
      to: 2010
    });

    //assert
    expect(actual).to.deep.equal(expected);
  });

  it('should interpolate and extrapolate measures values for a given range with years expanded', () => {
    //arrange
    const input = [
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
    ];

    const expected = [
      [
        "usa",
        2002,
        null,
        null
      ],
      [
        "usa",
        2003,
        null,
        null
      ],
      [
        "usa",
        2004,
        74.0,
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
        75.6,
        42
      ],
      [
        "usa",
        2007,
        77.2,
        42
      ],
      [
        "usa",
        2008,
        78.7,
        42
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
        80.3,
        null
      ],
      [
        "usa",
        2011,
        null,
        null
      ],
      [
        "usa",
        2012,
        null,
        null
      ]
    ];

    //act
    let actual = expandYears(input, {
      from: 2002,
      to: 2012
    });

    const measureColumnIndexes = _.range(2, 4);
    actual = interpolate(actual, measureColumnIndexes);
    actual = extrapolate(actual, measureColumnIndexes);

    //assert
    expect(actual).to.deep.equal(expected);
  });
});
