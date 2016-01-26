'use strict';

let format = require('./format.processor');

const DEFAULT_MIME_TYPE = 'application/json';
const MIME_TYPE_MAPPINGS = {
  csv: 'text/csv',
  json: DEFAULT_MIME_TYPE
};

module.exports = (req, res) => {
  let formatType = req.query.format;
  format(req.wsJson, formatType, (err, formattedData) => {
    if (err) {
      console.error(err);
      res.use_express_redis_cache = false;
      return res.json({success: false, error: err});
    }

    res.set('Content-Type', MIME_TYPE_MAPPINGS[formatType] || DEFAULT_MIME_TYPE);
    return res.send(formattedData);
  });
};
