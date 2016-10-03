'use strict';

const chai = require('chai');
const coder = require('./../../ws.utils/query-coder');

const expect = chai.expect;

describe('query coder', () => {
  it('should decode time params - undefined value given', () => {
    //arrange
    let input = undefined;

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should decode time params - empty string value given', () => {
    //arrange
    let input = '';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should decode time params - null value given', () => {
    //arrange
    let input = null;

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should decode time params - one time value given', () => {
    //arrange
    let input = '1950';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([1950]);
  });

  it('should decode time params - few time values given', () => {
    //arrange
    let input = '1951,1952';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([
      1951,
      1952
    ]);
  });

  it('should decode time params - time range given', () => {
    //arrange
    let input = '1953:1954';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([
      [
        1953,
        1954
      ]
    ]);
  });

  it('should decode time params - time range and specific time values are given', () => {
    //arrange
    let input = '1890,1953:1954,1986';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([
      1890,
      [
        1953,
        1954
      ],
      1986
    ]);
  });

  it('should decode time params - few time ranges and specific time values are given', () => {
    //arrange
    let input = '1890,1953:1954,1986,2010:2015';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([
      1890,
      [
        1953,
        1954
      ],
      1986,
      [
        2010,
        2015
      ]
    ]);
  });

  it('should encode time params - null value given', () => {
    //arrange
    let input = null;

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should encode time params - undefined value given', () => {
    //arrange
    let input = undefined;

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal(input);
  });

  it('should encode time params - empty array value given', () => {
    //arrange
    let input = [];

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('');
  });

  it('should encode time params - one time value given', () => {
    //arrange
    let input = 1986;

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal(1986);
  });

  it('should encode time params - few time values given', () => {
    //arrange
    let input = [
      1986,
      1987
    ];

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('1986,1987');
  });

  it('should encode time params - time range given', () => {
    //arrange
    let input = [
      [
        1986,
        1987
      ]
    ];

    //act
    let depth = true;
    let actual = coder.encodeParam(input, depth);

    //assert
    expect(actual).to.deep.equal('1986:1987');
  });

  it('should encode time params - time range and specific time values are given', () => {
    //arrange
    let input = [
      1890,
      [
        1953,
        '1954'
      ],
      1986
    ];

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('1890,1953:1954,1986');
  });

  it('should encode time params - few time ranges and specific time values are given', () => {
    //arrange
    let input = [
      1890,
      [
        1953,
        '1954'
      ],
      1986,
      [
        '2010',
        '2015'
      ]
    ];

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('1890,1953:1954,1986,2010:2015');
  });

  it('should decode gapfilling params - from given properly formatted string as an array', () => {
    //arrange
    let input = 'interpolation:exp,extrapolation:3';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([
      [
        'interpolation',
        'exp'
      ],
      [
        'extrapolation',
        3
      ]
    ]);
  });

  it('should decode gapfilling params - from given properly formatted string as an array - empty property will be stored a string', () => {
    //arrange
    let input = 'interpolation,extrapolation:3';

    //act
    let actual = coder.decodeParam(input);

    //assert
    expect(actual).to.deep.equal([
      'interpolation',
      [
        'extrapolation',
        3
      ]
    ]);
  });

  it('should decode gapfilling params - from given properly formatted string as an object', () => {
    //arrange
    let input = 'interpolation:exp,extrapolation:3';

    //act
    let actual = coder.decodeParam(input, coder.toObject);

    //assert
    expect(actual).to.deep.equal({interpolation: 'exp', extrapolation: 3});
  });

  it('should decode gapfilling params - from given properly formatted string as an object - empty property will have default "true" value', () => {
    //arrange
    let input = 'interpolation,extrapolation:3';

    //act
    let actual = coder.decodeParam(input, coder.toObject);

    //assert
    expect(actual).to.deep.equal({interpolation: true, extrapolation: 3});
  });

  it('should encode gapfilling params - from given array', () => {
    //arrange
    let input = [
      [
        'interpolation',
        'exp'
      ],
      [
        'extrapolation',
        '3'
      ]
    ];

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('interpolation:exp,extrapolation:3');
  });

  it('should encode gapfilling params - from given array - interpolation given without value', () => {
    //arrange
    let input = [
      'interpolation',
      [
        'extrapolation',
        '3'
      ]
    ];

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('interpolation,extrapolation:3');
  });

  it('should encode gapfilling params - from given object', () => {
    //arrange
    let input = {interpolation: 'exp', extrapolation: 3};

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('interpolation:exp,extrapolation:3');
  });

  it('should encode gapfilling params - from given object - given object always encoded as a flat structure', () => {
    //arrange
    let input = {interpolation: {some: 42}, extrapolation: 3};

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('interpolation:%5Bobject%20Object%5D,extrapolation:3');
  });

  it('should encode gapfilling params - from given object - property with "true" value is interpreted as a property without value in the encoded string', () => {
    //arrange
    let input = {interpolation: 'exp', extrapolation: true};

    //act
    let actual = coder.encodeParam(input);

    //assert
    expect(actual).to.deep.equal('interpolation:exp,extrapolation');
  });

  it('WS communication example - WSReader encodes query - select, where, gapfilling are given to WSReader', () => {
    //arrange:
    //WSReader get query from DataManager
    let input = {
      select: [
        'geo',
        'time',
        'pop'
      ],
      where: {
        geo: [
          'ind',
          'chn'
        ],
        'geo.region': [
          'afr',
          'europe'
        ],
        'geo.cat': [
          'region',
          'country'
        ],
        time: [
          1800,
          [
            2000,
            2010
          ],
          2015
        ]
      },
      gapfilling: {
        interpolation: 'log',
        extrapolation: 3
      }
    };

    //WSReader encodes query given by DataManager
    let selectEncoded = coder.encodeParam(input.select);
    let whereEncoded = Object.keys(input.where).map(key => `${key}=${coder.encodeParam(input.where[key])}`).join('&');
    let gapfillingEncoded = coder.encodeParam(input.gapfilling);

    //act:
    //WSReader creates query string to be sent to WS
    let actualEncodedQuery = `select=${selectEncoded}&${whereEncoded}&gapfilling=${gapfillingEncoded}`;

    //assert:
    let expectedEncodedQuery = 'select=geo,time,pop&geo=ind,chn&geo.region=afr,europe&geo.cat=region,country&time=1800,2000:2010,2015&gapfilling=interpolation:log,extrapolation:3';
    expect(actualEncodedQuery).to.equal(expectedEncodedQuery);
  });

  it('WS communication example - WS decodes query sent by WSReader - select, where, gapfilling are given to WS in the request.query object', () => {
    //arrange:
    //In this form we get WSReader query string parsed by express
    //Example query: select=geo,time,pop&geo=ind,chn&geo.region=afr,europe&geo.cat=region,country&time=1800,2000:2010,2015&gapfilling=interpolation:log,extrapolation:3;
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

    //act:
    //Transform req.query from WSReader to the form understandable by WS.
    let actual = Object.keys(req.query).reduce((result, key) => {

      let normalizedParam = normalizeParam(req.query[key]);
      let decodedParam = coder.decodeParam(normalizedParam);

      if (key === 'gapfilling') {
        result[key] = coder.decodeParam(normalizedParam, coder.toObject);
      } else if (key === 'select') {
        result[key] = decodedParam;
      } else {
        result.where[key] = decodedParam;
      }

      return result;
    }, {where: {}});

    function normalizeParam(param) {
      return Array.isArray(param) ? param.join() : param;
    }

    //assert:
    //WSReader query in form expected by WS.
    let expected = {
      select: [
        'geo',
        'time',
        'pop'
      ],
      where: {
        geo: [
          'ind',
          'chn'
        ],
        'geo.region': [
          'afr',
          'europe'
        ],
        'geo.cat': [
          'region',
          'country'
        ],
        time: [
          1800,
          [
            2000,
            2010
          ],
          2015
        ]
      },
      gapfilling: {interpolation: 'log', extrapolation: 3}
    };

    expect(actual).to.deep.equal(expected);
  });
});
