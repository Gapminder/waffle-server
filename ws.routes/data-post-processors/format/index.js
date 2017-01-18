'use strict';
const _ = require('lodash');
const Readable = require('stream').Readable;
const logger = require('../../../ws.config/log');

const format = require('./format.processor');
const routesUtils = require('../../utils');

const DEFAULT_MIME_TYPE = 'application/x-ws+json';
const MIME_TYPE_MAPPINGS = {
  wsJson: 'application/x-ws+json',
  csv: 'application/csv',
};

module.exports = (req, res) => {
  let formatType = req.query.format;
  const data = req.rawData;
  data.type = req.ddfDataType;

  return format(data, formatType, (err, packedData) => {
    if (err) {
      logger.error(err);
      res.use_express_redis_cache = false;
      return res.json(routesUtils.toErrorResponse(err));
    }

    res.set('Content-Type', MIME_TYPE_MAPPINGS[formatType] || DEFAULT_MIME_TYPE);

    return streamOrSend(packedData, res);
  });
};

function streamOrSend(data, response) {
  if (data instanceof Readable) {
    data.pipe(response);
  } else {
    return response.send(data);
  }
}
