'use strict';

const _ = require('lodash');
const json2csv = require('json2csv');

module.exports = (wsJson, formatType, cb) => {
  let headers = wsJson.headers;
  let rows = wsJson.rows;

  switch(formatType) {
    case 'csv':
      return toCsv(headers, rows, cb);
    case 'json':
      return toJson(headers, rows, cb);
    default:
      return cb(null, wsJson);
  }
};

function toCsv(headers, rows, cb) {
  toJson(headers, rows, (err, json) => {
    return json2csv({data: json, fields: headers, quotes: '"'}, (err, csv) => {
      if (err) {
        return cb(err);
      }

      return cb(null, csv);
    });
  });
}

function toJson(headers, rows, cb) {
  let json = _.map(rows, row => {
    return _.zipObject(headers, row);
  });

  return cb(null, json);
}
