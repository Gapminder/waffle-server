'use strict';

const _ = require('lodash');
const assert = require('assert');
const toPrecision = require('./toPrecision.processor');

describe('toPrecision data post processor', () => {
  it('should return input as is when undefined as input was given', () => {
    //act
    let actual = toPrecision(undefined);

    //assert
    assert.equal(actual, undefined);
  });

  it('should return input as is when null as input was given', () => {
    //act
    let actual = toPrecision(null);

    //assert
    assert.equal(actual, null);
  });

  it('should return empty array when empty array as input was given', () => {
    //act
    let actual = toPrecision([]);

    //assert
    assert.deepEqual(actual, []);
  });

  it('should spawn values with a given precision - one measure column given', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123],
      ["usa", 2005, 1.00213123123],
      ["usa", 2006, 1.00213123123],
      ["usa", 2007, 1.00213123123],
      ["usa", 2008, 1.00213123123],
      ["usa", 2009, 1.00213123123],
      ["usa", 2010, 1.00213123123]
    ];

    let expected = [
      ["usa", 2004, 1.0021],
      ["usa", 2005, 1.0021],
      ["usa", 2006, 1.0021],
      ["usa", 2007, 1.0021],
      ["usa", 2008, 1.0021],
      ["usa", 2009, 1.0021],
      ["usa", 2010, 1.0021]
    ];

    let precisionLevel = 4;
    let columnsToProcess = _.range(2, expected[0].length);

    //act
    let actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    assert.deepEqual(actual, expected);
  });

  it('should spawn values with a given precision - few measure columns given', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123, 1.00213123123],
      ["usa", 2005, 1.00213123123, 1.00213123123],
      ["usa", 2006, 1.00213123123, 1.00213123123],
      ["usa", 2007, 1.00213123123, 1.00213123123],
      ["usa", 2008, 1.00213123123, 1.00213123123],
      ["usa", 2009, 1.00213123123, 1.00213123123],
      ["usa", 2010, 1.00213123123, 1.00213123123]
    ];

    let expected = [
      ["usa", 2004, 1.0021, 1.0021],
      ["usa", 2005, 1.0021, 1.0021],
      ["usa", 2006, 1.0021, 1.0021],
      ["usa", 2007, 1.0021, 1.0021],
      ["usa", 2008, 1.0021, 1.0021],
      ["usa", 2009, 1.0021, 1.0021],
      ["usa", 2010, 1.0021, 1.0021]
    ];

    let precisionLevel = 4;
    let columnsToProcess = _.range(2, expected[0].length);

    //act
    let actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    assert.deepEqual(actual, expected);
  });

  it('should spawn values with a given precision - for given measure column only', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123, 1.00213123123],
      ["usa", 2005, 1.00213123123, 1.00213123123],
      ["usa", 2006, 1.00213123123, 1.00213123123],
      ["usa", 2007, 1.00213123123, 1.00213123123],
      ["usa", 2008, 1.00213123123, 1.00213123123],
      ["usa", 2009, 1.00213123123, 1.00213123123],
      ["usa", 2010, 1.00213123123, 1.00213123123]
    ];

    let expected = [
      ["usa", 2004, 1.0021, 1.00213123123],
      ["usa", 2005, 1.0021, 1.00213123123],
      ["usa", 2006, 1.0021, 1.00213123123],
      ["usa", 2007, 1.0021, 1.00213123123],
      ["usa", 2008, 1.0021, 1.00213123123],
      ["usa", 2009, 1.0021, 1.00213123123],
      ["usa", 2010, 1.0021, 1.00213123123]
    ];

    let precisionLevel = 4;
    let columnsToProcess = _.range(2, 3);

    //act
    let actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    assert.deepEqual(actual, expected);
  });

  it('should return input as is, when not existing columns to process given', () => {
    //arrange
    let input = [
      ["usa", 2004],
      ["usa", 2005],
      ["usa", 2006],
      ["usa", 2007],
      ["usa", 2008],
      ["usa", 2009],
      ["usa", 2010]
    ];

    let precisionLevel = 4;
    let columnsToProcess = _.range(2, 3);

    //act
    let actual = toPrecision(input, columnsToProcess, precisionLevel);

    //assert
    assert.deepEqual(actual, input);
  });

  it('should return input as is if no precision level was given', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123],
      ["usa", 2005, 1.00213123123],
      ["usa", 2006, 1.00213123123],
      ["usa", 2007, 1.00213123123],
      ["usa", 2008, 1.00213123123],
      ["usa", 2009, 1.00213123123],
      ["usa", 2010, 1.00213123123]
    ];

    let columnsToProcess = _.range(2, 3);

    //act
    let actual = toPrecision(input, columnsToProcess);

    //assert
    assert.deepEqual(actual, input);
  });

  it('should spawn values with a given precision for all columns when columns to process were not given', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123, 1.00213123123],
      ["usa", 2005, 1.00213123123, 1.00213123123],
      ["usa", 2006, 1.00213123123, 1.00213123123],
      ["usa", 2007, 1.00213123123, 1.00213123123],
      ["usa", 2008, 1.00213123123, 1.00213123123],
      ["usa", 2009, 1.00213123123, 1.00213123123],
      ["usa", 2010, 1.00213123123, 1.00213123123]
    ];

    let expected = [
      ["usa", 2004, 1.0021, 1.0021],
      ["usa", 2005, 1.0021, 1.0021],
      ["usa", 2006, 1.0021, 1.0021],
      ["usa", 2007, 1.0021, 1.0021],
      ["usa", 2008, 1.0021, 1.0021],
      ["usa", 2009, 1.0021, 1.0021],
      ["usa", 2010, 1.0021, 1.0021]
    ];

    let precisionLevel = 4;

    //act
    let actual = toPrecision(input, null, precisionLevel);

    //assert
    assert.deepEqual(actual, expected);
  });

  it('should return input as is when given precision level cannot be parsed as a number', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123, 1.00213123123],
      ["usa", 2005, 1.00213123123, 1.00213123123],
      ["usa", 2006, 1.00213123123, 1.00213123123],
      ["usa", 2007, 1.00213123123, 1.00213123123],
      ["usa", 2008, 1.00213123123, 1.00213123123],
      ["usa", 2009, 1.00213123123, 1.00213123123],
      ["usa", 2010, 1.00213123123, 1.00213123123]
    ];

    let precisionLevel = 'bla';

    //act
    let actual = toPrecision(input, null, precisionLevel);

    //assert
    assert.deepEqual(actual, input);
  });


  it('should return input with 0 precision level when given level is less than 0', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123, 1.00213123123],
      ["usa", 2005, 1.00213123123, 1.00213123123],
      ["usa", 2006, 1.00213123123, 1.00213123123],
      ["usa", 2007, 1.00213123123, 1.00213123123],
      ["usa", 2008, 1.00213123123, 1.00213123123],
      ["usa", 2009, 1.00213123123, 1.00213123123],
      ["usa", 2010, 1.00213123123, 1.00213123123]
    ];

    let expected = [
      ["usa", 2004, 1, 1],
      ["usa", 2005, 1, 1],
      ["usa", 2006, 1, 1],
      ["usa", 2007, 1, 1],
      ["usa", 2008, 1, 1],
      ["usa", 2009, 1, 1],
      ["usa", 2010, 1, 1]
    ];

    let precisionLevel = -42;

    //act
    let actual = toPrecision(input, null, precisionLevel);

    //assert
    assert.deepEqual(actual, expected);
  });

  it('should return input with 15 precision level when given level is more than 15', () => {
    //arrange
    let input = [
      ["usa", 2004, 1.00213123123, 1.00213123123],
      ["usa", 2005, 1.00213123123, 1.00213123123],
      ["usa", 2006, 1.00213123123, 1.00213123123],
      ["usa", 2007, 1.00213123123, 1.00213123123],
      ["usa", 2008, 1.00213123123, 1.00213123123],
      ["usa", 2009, 1.00213123123, 1.00213123123],
      ["usa", 2010, 1.00213123123, 1.00213123123]
    ];

    let precisionLevel = 16;

    //act
    let actual = toPrecision(input, null, precisionLevel);

    //assert
    assert.deepEqual(actual, input);
  });
});
