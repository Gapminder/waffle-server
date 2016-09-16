'use strict';

const _ = require('lodash');
const chai = require('chai');
const interpolate = require('./interpolation.processor');

const expect = chai.expect;

it('should return empty result when input was empty', () => {
  //arrange
  const input = [];

  //act
  const actual = interpolate(input);

  //assert
  expect(actual).to.deep.equal(input);
});

it('should return input as is when there is nothing to interpolate', () => {
  //arrange
  const input = [
    ["usa", 2004, 71.7],
    ["usa", 2005, 74.0],
    ["usa", 2006, 75.6],
    ["usa", 2007, 81.9],
    ["angola", 2007, 81.9]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(input);
});

it('should return input as is when there is nothing to interpolate - all measure values are null', () => {
  //arrange
  const input = [
    ["usa", 2004, null],
    ["usa", 2005, null],
    ["usa", 2006, null],
    ["usa", 2007, null],
    ["angola", 2007, null]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(input);
});

it('should interpolate measure values for a given range - only one mesaure used', () => {
  //arrange
  const input = [
    ["armenia", 2004, null],
    ["armenia", 2005, 74.0],
    ["armenia", 2006, null],
    ["armenia", 2007, null],
    ["armenia", 2008, null],
    ["armenia", 2009, null],
    ["armenia", 2010, 81.9],
    ["armenia", 2011, null]
  ];

  const expected = [
    ["armenia", 2004, null],
    ["armenia", 2005, 74.0],
    ["armenia", 2006, 75.6],
    ["armenia", 2007, 77.2],
    ["armenia", 2008, 78.7],
    ["armenia", 2009, 80.3],
    ["armenia", 2010, 81.9],
    ["armenia", 2011, null]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(expected);
});

it('should interpolate measure values for a given range - only one measure used, measure values have 2 gaps', () => {
  //arrange
  const input = [
    ["usa", 2000, 71.7],
    ["usa", 2001, null],
    ["usa", 2002, null],
    ["usa", 2003, null],
    ["usa", 2004, null],
    ["usa", 2005, 74.0],
    ["usa", 2006, null],
    ["usa", 2007, null],
    ["usa", 2008, null],
    ["usa", 2009, null],
    ["usa", 2010, 81.9]
  ];

  const expected = [
    ["usa", 2000, 71.7],
    ["usa", 2001, 72.2],
    ["usa", 2002, 72.6],
    ["usa", 2003, 73.1],
    ["usa", 2004, 73.5],
    ["usa", 2005, 74.0],
    ["usa", 2006, 75.6],
    ["usa", 2007, 77.2],
    ["usa", 2008, 78.7],
    ["usa", 2009, 80.3],
    ["usa", 2010, 81.9]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(expected);
});

it('should interpolate measure values for a given range - only one mesaure used, years have gaps', () => {
  //arrange
  const input = [
    ["usa", 2000, 71.7],
    ["usa", 2001, null],
    ["usa", 2002, null],
    ["usa", 2003, null],
    ["usa", 2004, null],
    ["usa", 2005, 74],
    ["usa", 2006, null],
    ["usa", 2009, null],
    ["usa", 2010, 81.9]
  ];

  const expected = [
    ["usa", 2000, 71.7],
    ["usa", 2001, 72.2],
    ["usa", 2002, 72.6],
    ["usa", 2003, 73.1],
    ["usa", 2004, 73.5],
    ["usa", 2005, 74],
    ["usa", 2006, 75.6],
    ["usa", 2009, 80.3],
    ["usa", 2010, 81.9]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(expected);
});

it('should return input as is when it is impossible to interpolate value - only one existing value is available', () => {
  //arrange
  const input = [
    ['angola', 1999, null],
    ['angola', 2000, 22.5],
    ['angola', 2001, null]
  ];

  const expected = [
    ['angola', 1999, null],
    ['angola', 2000, 22.5],
    ['angola', 2001, null]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(expected);
});

it('should interpolate few measures values for a given range - only one existing value is available', () => {
  //arrange
  const input = [
    ["usa", 2004, null, 68.5],
    ["usa", 2005, 74.0, null],
    ["usa", 2006, null, null],
    ["usa", 2007, null, null],
    ["usa", 2008, null, null],
    ["usa", 2009, null, 76.6],
    ["usa", 2010, 81.9, null]
  ];

  const expected = [
    ["usa", 2004, null, 68.5],
    ["usa", 2005, 74.0, 70.1],
    ["usa", 2006, 75.6, 71.7],
    ["usa", 2007, 77.2, 73.4],
    ["usa", 2008, 78.7, 75.0],
    ["usa", 2009, 80.3, 76.6],
    ["usa", 2010, 81.9, null]
  ];

  //act
  const actual = interpolate(input, _.range(2, 4));

  //assert
  expect(actual).to.deep.equal(expected);
});

it('should interpolate measure values for a given range - few countries are in the input', () => {
  //arrange
  const input = [
    ["angola", 2000, 74.0],
    ["angola", 2001, null],
    ["angola", 2002, null],
    ["angola", 2003, 78.7],
    ["usa", 2000, 71.7],
    ["usa", 2005, 74.0],
    ["usa", 2006, null],
    ["usa", 2010, 81.9]
  ];

  const expected = [
    ["angola", 2000, 74.0],
    ["angola", 2001, 75.6],
    ["angola", 2002, 77.1],
    ["angola", 2003, 78.7],
    ["usa", 2000, 71.7],
    ["usa", 2005, 74.0],
    ["usa", 2006, 75.6],
    ["usa", 2010, 81.9]
  ];

  //act
  const actual = interpolate(input, _.range(2, 3));

  //assert
  expect(actual).to.deep.equal(expected);
});
