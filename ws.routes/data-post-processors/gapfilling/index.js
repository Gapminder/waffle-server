'use strict';
const _ = require('lodash');
const interpolate = require("./interpolation");
const extrapolate = require("./extrapolation");
const expandYears = require("./yearsExpander");

module.exports = (req, res, next) => {
  if (req.wsJson && req.wsJson.rows && req.decodedQuery.gapfilling) {
    let headers = req.wsJson.headers;
    let geoColumnIndex = headers.indexOf('geo');
    let yearColumnIndex = headers.indexOf('time');
    let measureColumnIndexes = _.chain(headers).keys().difference([geoColumnIndex, yearColumnIndex]).value();

    let gapfilling = req.decodedQuery.gapfilling;
    let options = {
      numOfYearsToExtrapolate: gapfilling.extrapolation,
      geoColumnIndex: geoColumnIndex,
      yearColumnIndex: yearColumnIndex
    };

    req.wsJson.rows = _.chain(req.decodedQuery.where.time)
      .filter(_.isArray)
      .reduce((result, range) => {
        return expandYears(result, {from: range[0], to: range[1]});
      }, req.wsJson.rows)
      .value();

    let shouldInterpolate = !!gapfilling.interpolation;
    let shouldExtrapolate = !!gapfilling.extrapolation;

    switch (true) {
      case (shouldInterpolate && shouldExtrapolate):
        req.wsJson.rows = interpolate(req.wsJson.rows, measureColumnIndexes, options);
        req.wsJson.rows = extrapolate(req.wsJson.rows, measureColumnIndexes, options);
        break;
      case (shouldInterpolate):
        req.wsJson.rows = interpolate(req.wsJson.rows, measureColumnIndexes, options);
        break;
      case (shouldExtrapolate):
        req.wsJson.rows = extrapolate(req.wsJson.rows, measureColumnIndexes, options);
        break;
      default:
        break;
    }
  }

  return next();
};
