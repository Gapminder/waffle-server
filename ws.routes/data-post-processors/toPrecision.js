'use strict';

let toPrecision = require('./toPrecision.processor');

module.exports = (req, res, next) => {
  if (req.wsJson && req.wsJson.rows) {
    req.wsJson.rows = toPrecision(req.wsJson.rows, null, req.query.precisionLevel);
  }

  next();
};
