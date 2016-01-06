'use strict';

const _ = require('lodash');

module.exports = (dataToExpandYears, neededRange, options) => {
  options = options || {};
  let geoColumnIndex = options.geoColumnIndex || 0;
  let yearColumnIndex = options.yearColumnIndex || 1;

  return _.chain(dataToExpandYears)
    .groupBy(row => row[geoColumnIndex])
    .map(row => {
      let firstRecord = _.first(row);

      let yearsThatShouldBeAdded = _.difference(_.range(neededRange.from, neededRange.to + 1), _.pluck(row, yearColumnIndex));
      let extraRecords = yearsThatShouldBeAdded.map(year => {
        let templateRecord = new Array(firstRecord.length).fill(null);
        templateRecord[geoColumnIndex] = firstRecord[geoColumnIndex];
        templateRecord[yearColumnIndex] = year;
        return templateRecord;
      });

      return _.sortBy(row.concat(extraRecords), yearColumnIndex);
    })
    .flatten()
    .value();
};
