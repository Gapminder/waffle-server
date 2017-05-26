import * as _ from 'lodash';

export {
  interpolate
};

function interpolate(dataToInterpolate: any, measureValueColumnIndexes?: any, options?: any): any {
  if (_.isEmpty(dataToInterpolate)) {
    return dataToInterpolate;
  }

  options = options || {};
  let geoColumnIndex = _.isNumber(options.geoColumnIndex) ? options.geoColumnIndex : 0;
  let yearColumnIndex = _.isNumber(options.yearColumnIndex) ? options.yearColumnIndex : 1;

  return _.chain(dataToInterpolate)
    .groupBy((row: any) => row[geoColumnIndex])
    .map((GeoGroup: any) => {
      let sortedByYearGeoGroup = _.sortBy(GeoGroup, yearColumnIndex);
      _.forEach(measureValueColumnIndexes, (measureValueColumn: any) => {
        interpolate(sortedByYearGeoGroup, measureValueColumn);
      });
      return sortedByYearGeoGroup;
    })
    .flatten()
    .value();

  function interpolate(sortedByYearGeoGroup: any, measureValueColumn: any): void {
    const rangesOfYearsToInterpolate = detectRangesOfYearsToInterpolate(sortedByYearGeoGroup, measureValueColumn);

    _.forEach(rangesOfYearsToInterpolate, (range: any) => {
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

  function detectRangesOfYearsToInterpolate(sortedByYearGeoGroup: any, measureValueColumn: any): any {
    let rangesOfYearsToInterpolate = [];

    _.chain(sortedByYearGeoGroup)
      .map((row: any, idx: any) => {
        if (nonEmpty(row[measureValueColumn])) {
          return idx;
        }
      })
      .filter(nonEmpty)
      .reduce((prev: number, next: number) => {
        if ((next - prev) > 1) {
          rangesOfYearsToInterpolate.push([prev, next]);
          return next;
        }
        return next;
      })
      .value();

    return rangesOfYearsToInterpolate;
  }

  // TODO: plug different interpolation strategies
  function interpolateMeasureValue(yearMeasureValueFirst: any, yearMeasureValueLast: any, yearAtWhichMeasureValueIsUnknown: any): any {
    let interpolatedValue =
      yearMeasureValueFirst.measureValue
      + (yearMeasureValueLast.measureValue - yearMeasureValueFirst.measureValue)
      * (yearAtWhichMeasureValueIsUnknown - yearMeasureValueFirst.year)
      / (yearMeasureValueLast.year - yearMeasureValueFirst.year);

    return _.round(interpolatedValue, 1);
  }

  function nonEmpty(val: any): any {
    return !_.isUndefined(val) && !_.isNull(val);
  }
}
