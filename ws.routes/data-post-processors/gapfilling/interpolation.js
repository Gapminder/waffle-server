'use strict';

const _ = require('lodash');

module.exports = (dataToInterpolate, measureValueColumnIndexes, options) => {
  if (_.isEmpty(dataToInterpolate)) {
    return dataToInterpolate;
  }

  options = options || {};
  let geoColumnIndex = _.isNumber(options.geoColumnIndex) ? options.geoColumnIndex : 0;
  let yearColumnIndex = _.isNumber(options.yearColumnIndex) ? options.yearColumnIndex : 1;

  return _.chain(dataToInterpolate)
    .groupBy(row => row[geoColumnIndex])
    .map(GeoGroup => {
      let sortedByYearGeoGroup = _.sortBy(GeoGroup, yearColumnIndex);
      _.forEach(measureValueColumnIndexes, measureValueColumn => {
        interpolate(sortedByYearGeoGroup, measureValueColumn);
      });
      return sortedByYearGeoGroup;
    })
    .flatten()
    .value();

  function interpolate(sortedByYearGeoGroup, measureValueColumn) {
    var rangesOfYearsToInterpolate = detectRangesOfYearsToInterpolate(sortedByYearGeoGroup, measureValueColumn);

    _.forEach(rangesOfYearsToInterpolate, range => {
      let startRangeIndex = range[0];
      let finishRangeIndex = range[1];

      let yearMeasureValueFirst = {
        year: sortedByYearGeoGroup[startRangeIndex][yearColumnIndex],
        measureValue: sortedByYearGeoGroup[startRangeIndex][measureValueColumn]
      };

      let yearMeasureValueLast = {
        year: sortedByYearGeoGroup[finishRangeIndex][yearColumnIndex],
        measureValue: sortedByYearGeoGroup[finishRangeIndex][measureValueColumn]
      };

      for (let next = startRangeIndex + 1; next < finishRangeIndex; next++) {
        sortedByYearGeoGroup[next][measureValueColumn] = interpolateMeasureValue(
          yearMeasureValueFirst,
          yearMeasureValueLast,
          sortedByYearGeoGroup[next][yearColumnIndex]
        );
      }
    });
  }

  function detectRangesOfYearsToInterpolate(sortedByYearGeoGroup, measureValueColumn) {
    let rangesOfYearsToInterpolate = [];

    _.chain(sortedByYearGeoGroup)
      .map((row, idx) => {
        if (nonEmpty(row[measureValueColumn])) {
          return idx
        }
      })
      .filter(nonEmpty)
      .reduce((prev, next) => {
        if ((next - prev) > 1) {
          rangesOfYearsToInterpolate.push([prev, next]);
          return next;
        }
        return next;
      })
      .value();

    return rangesOfYearsToInterpolate;
  }

  //TODO: plug different interpolation strategies
  function interpolateMeasureValue(yearMeasureValueFirst, yearMeasureValueLast, yearAtWhichMeasureValueIsUnknown) {
    let interpolatedValue =
      yearMeasureValueFirst.measureValue
      + (yearMeasureValueLast.measureValue - yearMeasureValueFirst.measureValue)
      * (yearAtWhichMeasureValueIsUnknown - yearMeasureValueFirst.year)
      / (yearMeasureValueLast.year - yearMeasureValueFirst.year);

    return _.round(interpolatedValue, 1)
  }

  function nonEmpty(val) {
    return !_.isUndefined(val) && !_.isNull(val);
  }
};
