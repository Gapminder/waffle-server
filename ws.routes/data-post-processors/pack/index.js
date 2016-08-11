'use strict';
const _ = require('lodash');
const logger = require('../../../ws.config/log');

const pack = require('./pack.processor');

const DEFAULT_MIME_TYPE = 'application/x-ddf+json';
const MIME_TYPE_MAPPINGS = {
  csv: 'text/csv',
  json: 'application/json',
  wsJson: 'application/x-ws+json',
  ddfJson: DEFAULT_MIME_TYPE
};

module.exports = (req, res) => {
  let formatType = req.query.format;
  const data = req.rawData;

  return pack(data, formatType, (err, packedData) => {
    if (err) {
      logger.error(err);
      res.use_express_redis_cache = false;
      return res.json({success: false, error: err});
    }

    res.set('Content-Type', MIME_TYPE_MAPPINGS[formatType] || DEFAULT_MIME_TYPE);

    return res.send(packedData);
  });
};
