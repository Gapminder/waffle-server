'use strict';

const _ = require('lodash');

module.exports = (req, res, next) => {
  if (req.wsJson && req.wsJson.rows) {
    req.wsJson.rows = toPrecision(req.wsJson.rows, null, req.query.precisionLevel);
  }

  next();
};

function toPrecision(matrix, columns, precisionLevel) {
  let precision = parseInt(precisionLevel, 10);

  if (!matrix || !matrix.length || _.isNaN(precision)) {
    return matrix;
  }

  precision = precision < 0 ? 0 : precision;
  precision = precision > 15 ? 15 : precision;

  const columnsToProcess = columns || _.range(matrix[0].length);

  return _.map(matrix, row => {
    return _.map(row, (cell, column) => {
      if (_.isNumber(cell) && _.contains(columnsToProcess, column)) {
        return parseFloat(cell.toFixed(precision), 10)
      }
      return cell;
    });
  });
}
