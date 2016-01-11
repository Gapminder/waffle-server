'use strict';

const assert = require('assert');
const coder = require('./query-coder');

describe('Query coder', () => {
  describe('should decode time params', () => {
    it('undefined value given', () => {
      //arrange
      let input = undefined;

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, input);
    });

    it('empty string value given', () => {
      //arrange
      let input = '';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, input);
    });

    it('null value given', () => {
      //arrange
      let input = null;

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, input);
    });

    it('one time value given', () => {
      //arrange
      let input = '1950';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, ['1950']);
    });

    it('few time values given', () => {
      //arrange
      let input = '1951,1952';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, ['1951', '1952']);
    });

    it('time range given', () => {
      //arrange
      let input = '1953:1954';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, [['1953', '1954']]);
    });

    it('time range and specific time values are given', () => {
      //arrange
      let input = '1890,1953:1954,1986';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, ['1890',['1953', '1954'],'1986']);
    });

    it('few time ranges and specific time values are given', () => {
      //arrange
      let input = '1890,1953:1954,1986,2010:2015';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, ['1890',['1953', '1954'],'1986',['2010', '2015']]);
    });
  });

  describe('should encode time params', () => {
    it('null value given', () => {
      //arrange
      let input = null;

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, input);
    });

    it('undefined value given', () => {
      //arrange
      let input = undefined;

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, input);
    });

    it('empty array value given', () => {
      //arrange
      let input = [];

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, '');
    });

    it('one time value given', () => {
      //arrange
      let input = 1986;

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, '1986');
    });

    it('few time values given', () => {
      //arrange
      let input = [1986, 1987];

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, '1986,1987');
    });

    it('time range given', () => {
      //arrange
      let input = [[1986, 1987]];

      //act
      let depth = true;
      let actual = coder.encodeParam(input, depth);

      //assert
      assert.deepEqual(actual, '1986:1987');
    });

    it('time range and specific time values are given', () => {
      //arrange
      let input = [1890,[1953, '1954'],1986];

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, '1890,1953:1954,1986');
    });

    it('few time ranges and specific time values are given', () => {
      //arrange
      let input = [1890,[1953, '1954'],1986, ['2010', '2015']];

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, '1890,1953:1954,1986,2010:2015');
    });
  });

  describe('should decode gapfilling params', () => {
    it('from given properly formatted string as an array', () => {
      //arrange
      let input = 'interpolation:exp,extrapolation:3';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, [['interpolation', 'exp'], ['extrapolation', '3']]);
    });

    it('from given properly formatted string as an array - empty property will be stored a string', () => {
      //arrange
      let input = 'interpolation,extrapolation:3';

      //act
      let actual = coder.decodeParam(input);

      //assert
      assert.deepEqual(actual, ['interpolation', ['extrapolation', '3']]);
    });

    it('from given properly formatted string as an object', () => {
      //arrange
      let input = 'interpolation:exp,extrapolation:3';

      //act
      let actual = coder.decodeParam(input, coder.toObject);

      //assert
      assert.deepEqual(actual, {interpolation: 'exp', extrapolation: 3});
    });

    it('from given properly formatted string as an object - empty property will have default "true" value', () => {
      //arrange
      let input = 'interpolation,extrapolation:3';

      //act
      let actual = coder.decodeParam(input, coder.toObject);

      //assert
      assert.deepEqual(actual, {interpolation: true, extrapolation: 3});
    });
  });

  describe('should encode gapfilling params', () => {
    it('from given array', () => {
      //arrange
      let input = [['interpolation', 'exp'], ['extrapolation', '3']];

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, 'interpolation:exp,extrapolation:3');
    });

    it('from given array - interpolation given without value', () => {
      //arrange
      let input = ['interpolation', ['extrapolation', '3']];

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, 'interpolation,extrapolation:3');
    });

    it('from given object', () => {
      //arrange
      let input = {interpolation: 'exp', extrapolation: 3};

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, 'interpolation:exp,extrapolation:3');
    });

    it('from given object - given object always encoded as a flat structure', () => {
      //arrange
      let input = {interpolation: {some: 42}, extrapolation: 3};

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, 'interpolation:%5Bobject%20Object%5D,extrapolation:3');
    });

    it('from given object - property with "true" value is interpreted as a property without value in the encoded string', () => {
      //arrange
      let input = {interpolation: 'exp', extrapolation: true};

      //act
      let actual = coder.encodeParam(input);

      //assert
      assert.deepEqual(actual, 'interpolation:exp,extrapolation');
    });
  });

  describe('WSReader -> WS communication example', () => {
    it('WSReader encodes query - select, where, gapfilling are given to WSReader', () => {
      //arrange:
      //WSReader get query from DataManager
      let input = {
        select: ['geo', 'time', 'pop'],
        where: {
          geo:['ind','chn'],
          'geo.region':['afr', 'europe'],
          'geo.cat':['region', 'country'],
          time:[1800,[2000, 2010],2015]
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
      assert.equal(actualEncodedQuery, expectedEncodedQuery);
    });

    it('WS decodes query sent by WSReader - select, where, gapfilling are given to WS in the request.query object', () => {
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
          result.where[key] = decodedParam
        }

        return result;
      }, {where: {}});

      function normalizeParam(param) {
        return Array.isArray(param) ? param.join() : param;
      }

      //assert:
      //WSReader query in form expected by WS.
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

      assert.deepEqual(actual, expected);
    });
  });
});
