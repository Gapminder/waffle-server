'use strict';

let pack = require('./pack.processor.js');

const DEFAULT_MIME_TYPE = 'application/json';
const MIME_TYPE_MAPPINGS = {
  csv: 'text/csv',
  json: DEFAULT_MIME_TYPE,
  wsJson: 'application/x-ws+json',
  ddfJson: 'application/x-ddf+json'
};

module.exports = (req, res) => {
  let formatType = req.query.format;

  return pack(req.wsJson, formatType, (err, packedData) => {
    if (err) {
      console.error(err);
      res.use_express_redis_cache = false;
      return res.json({success: false, error: err});
    }

    res.set('Content-Type', MIME_TYPE_MAPPINGS[formatType] || DEFAULT_MIME_TYPE);

    return res.send(packedData);
  });
};
