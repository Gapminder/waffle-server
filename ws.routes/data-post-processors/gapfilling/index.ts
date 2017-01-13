import * as _ from 'lodash';
import {interpolate} from "./interpolation.processor";
import {extrapolate} from "./extrapolation.processor";
import {expandYears} from "./yearsExpander.processor";

export {
  gapfillingMiddleware
};

function gapfillingMiddleware(req, res, next: Function) {
  if (req.wsJson && req.wsJson.rows && req.decodedQuery && req.decodedQuery.gapfilling) {
    let headers = req.wsJson.headers;
    let geoColumnIndex = headers.indexOf('geo');
    let yearColumnIndex = headers.indexOf('time');
    let measureColumnIndexes = _.chain(headers).keys().map(toNumber).difference([geoColumnIndex, yearColumnIndex]).value();

    let gapfilling = req.decodedQuery.gapfilling;
    let options = {
      numOfYearsToExtrapolate: gapfilling.extrapolation,
      geoColumnIndex: geoColumnIndex,
      yearColumnIndex: yearColumnIndex
    };

    let time = req.decodedQuery.where && req.decodedQuery.where.time ? req.decodedQuery.where.time : [];

    req.wsJson.rows = _.chain(time)
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

function toNumber(k) {
  return parseInt(k, 10);
}
