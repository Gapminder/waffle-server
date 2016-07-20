import test from 'ava';
import _ from 'lodash';
import toPrecision from './toPrecision.processor';

test('should return input as is when undefined as input was given', assert => {
  //act
  const actual = toPrecision(undefined);

  //assert
  assert.is(actual, undefined);
});

test('should return input as is when null as input was given', assert => {
  //act
  const actual = toPrecision(null);

  //assert
  assert.is(actual, null);
});

test('should return empty array when empty array as input was given', assert => {
  //act
  const actual = toPrecision([]);

  //assert
  assert.deepEqual(actual, []);
});

test('should spawn values with a given precision - one measure column given', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123],
    ["usa", 2005, 1.00213123123],
    ["usa", 2006, 1.00213123123],
    ["usa", 2007, 1.00213123123],
    ["usa", 2008, 1.00213123123],
    ["usa", 2009, 1.00213123123],
    ["usa", 2010, 1.00213123123]
  ];

  const expected = [
    ["usa", 2004, 1.0021],
    ["usa", 2005, 1.0021],
    ["usa", 2006, 1.0021],
    ["usa", 2007, 1.0021],
    ["usa", 2008, 1.0021],
    ["usa", 2009, 1.0021],
    ["usa", 2010, 1.0021]
  ];

  const precisionLevel = 4;
  const columnsToProcess = _.range(2, expected[0].length);

  //act
  const actual = toPrecision(input, columnsToProcess, precisionLevel);

  //assert
  assert.deepEqual(actual, expected);
});

test('should spawn values with a given precision - few measure columns given', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123, 1.00213123123],
    ["usa", 2005, 1.00213123123, 1.00213123123],
    ["usa", 2006, 1.00213123123, 1.00213123123],
    ["usa", 2007, 1.00213123123, 1.00213123123],
    ["usa", 2008, 1.00213123123, 1.00213123123],
    ["usa", 2009, 1.00213123123, 1.00213123123],
    ["usa", 2010, 1.00213123123, 1.00213123123]
  ];

  const expected = [
    ["usa", 2004, 1.0021, 1.0021],
    ["usa", 2005, 1.0021, 1.0021],
    ["usa", 2006, 1.0021, 1.0021],
    ["usa", 2007, 1.0021, 1.0021],
    ["usa", 2008, 1.0021, 1.0021],
    ["usa", 2009, 1.0021, 1.0021],
    ["usa", 2010, 1.0021, 1.0021]
  ];

  const precisionLevel = 4;
  const columnsToProcess = _.range(2, expected[0].length);

  //act
  const actual = toPrecision(input, columnsToProcess, precisionLevel);

  //assert
  assert.deepEqual(actual, expected);
});

test('should spawn values with a given precision - for given measure column only', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123, 1.00213123123],
    ["usa", 2005, 1.00213123123, 1.00213123123],
    ["usa", 2006, 1.00213123123, 1.00213123123],
    ["usa", 2007, 1.00213123123, 1.00213123123],
    ["usa", 2008, 1.00213123123, 1.00213123123],
    ["usa", 2009, 1.00213123123, 1.00213123123],
    ["usa", 2010, 1.00213123123, 1.00213123123]
  ];

  const expected = [
    ["usa", 2004, 1.0021, 1.00213123123],
    ["usa", 2005, 1.0021, 1.00213123123],
    ["usa", 2006, 1.0021, 1.00213123123],
    ["usa", 2007, 1.0021, 1.00213123123],
    ["usa", 2008, 1.0021, 1.00213123123],
    ["usa", 2009, 1.0021, 1.00213123123],
    ["usa", 2010, 1.0021, 1.00213123123]
  ];

  const precisionLevel = 4;
  const columnsToProcess = _.range(2, 3);

  //act
  const actual = toPrecision(input, columnsToProcess, precisionLevel);

  //assert
  assert.deepEqual(actual, expected);
});

test('should return input as is, when not existing columns to process given', assert => {
  //arrange
  const input = [
    ["usa", 2004],
    ["usa", 2005],
    ["usa", 2006],
    ["usa", 2007],
    ["usa", 2008],
    ["usa", 2009],
    ["usa", 2010]
  ];

  const precisionLevel = 4;
  const columnsToProcess = _.range(2, 3);

  //act
  const actual = toPrecision(input, columnsToProcess, precisionLevel);

  //assert
  assert.deepEqual(actual, input);
});

test('should return input as is if no precision level was given', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123],
    ["usa", 2005, 1.00213123123],
    ["usa", 2006, 1.00213123123],
    ["usa", 2007, 1.00213123123],
    ["usa", 2008, 1.00213123123],
    ["usa", 2009, 1.00213123123],
    ["usa", 2010, 1.00213123123]
  ];

  const columnsToProcess = _.range(2, 3);

  //act
  const actual = toPrecision(input, columnsToProcess);

  //assert
  assert.deepEqual(actual, input);
});

test('should spawn values with a given precision for all columns when columns to process were not given', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123, 1.00213123123],
    ["usa", 2005, 1.00213123123, 1.00213123123],
    ["usa", 2006, 1.00213123123, 1.00213123123],
    ["usa", 2007, 1.00213123123, 1.00213123123],
    ["usa", 2008, 1.00213123123, 1.00213123123],
    ["usa", 2009, 1.00213123123, 1.00213123123],
    ["usa", 2010, 1.00213123123, 1.00213123123]
  ];

  const expected = [
    ["usa", 2004, 1.0021, 1.0021],
    ["usa", 2005, 1.0021, 1.0021],
    ["usa", 2006, 1.0021, 1.0021],
    ["usa", 2007, 1.0021, 1.0021],
    ["usa", 2008, 1.0021, 1.0021],
    ["usa", 2009, 1.0021, 1.0021],
    ["usa", 2010, 1.0021, 1.0021]
  ];

  const precisionLevel = 4;

  //act
  const actual = toPrecision(input, null, precisionLevel);

  //assert
  assert.deepEqual(actual, expected);
});

test('should return input as is when given precision level cannot be parsed as a number', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123, 1.00213123123],
    ["usa", 2005, 1.00213123123, 1.00213123123],
    ["usa", 2006, 1.00213123123, 1.00213123123],
    ["usa", 2007, 1.00213123123, 1.00213123123],
    ["usa", 2008, 1.00213123123, 1.00213123123],
    ["usa", 2009, 1.00213123123, 1.00213123123],
    ["usa", 2010, 1.00213123123, 1.00213123123]
  ];

  const precisionLevel = 'bla';

  //act
  const actual = toPrecision(input, null, precisionLevel);

  //assert
  assert.deepEqual(actual, input);
});


test('should return input with 0 precision level when given level is less than 0', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123, 1.00213123123],
    ["usa", 2005, 1.00213123123, 1.00213123123],
    ["usa", 2006, 1.00213123123, 1.00213123123],
    ["usa", 2007, 1.00213123123, 1.00213123123],
    ["usa", 2008, 1.00213123123, 1.00213123123],
    ["usa", 2009, 1.00213123123, 1.00213123123],
    ["usa", 2010, 1.00213123123, 1.00213123123]
  ];

  const expected = [
    ["usa", 2004, 1, 1],
    ["usa", 2005, 1, 1],
    ["usa", 2006, 1, 1],
    ["usa", 2007, 1, 1],
    ["usa", 2008, 1, 1],
    ["usa", 2009, 1, 1],
    ["usa", 2010, 1, 1]
  ];

  const precisionLevel = -42;

  //act
  const actual = toPrecision(input, null, precisionLevel);

  //assert
  assert.deepEqual(actual, expected);
});

test('should return input with 15 precision level when given level is more than 15', assert => {
  //arrange
  const input = [
    ["usa", 2004, 1.00213123123, 1.00213123123],
    ["usa", 2005, 1.00213123123, 1.00213123123],
    ["usa", 2006, 1.00213123123, 1.00213123123],
    ["usa", 2007, 1.00213123123, 1.00213123123],
    ["usa", 2008, 1.00213123123, 1.00213123123],
    ["usa", 2009, 1.00213123123, 1.00213123123],
    ["usa", 2010, 1.00213123123, 1.00213123123]
  ];

  const precisionLevel = 16;

  //act
  const actual = toPrecision(input, null, precisionLevel);

  //assert
  assert.deepEqual(actual, input);
});
