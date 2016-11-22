'use strict';
const _ = require('lodash');
const logger = require('../../../ws.config/log');

const format = require('./format.processor');

const DEFAULT_MIME_TYPE = 'application/x-ws+json';
const MIME_TYPE_MAPPINGS = {
  wsJson: 'application/x-ws+json',
};

module.exports = (req, res) => {
  let formatType = req.query.format;
  const data = req.rawData;
  data.type = req.ddfDataType;

  return format(data, formatType, (err, packedData) => {
    if (err) {
      logger.error(err);
      res.use_express_redis_cache = false;
      return res.json({success: false, error: err});
    }

    res.set('Content-Type', MIME_TYPE_MAPPINGS[formatType] || DEFAULT_MIME_TYPE);

    return res.send(packedData);
  });
};
