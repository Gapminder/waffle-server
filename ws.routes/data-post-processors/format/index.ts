import { Readable } from 'stream';
import { logger } from '../../../ws.config/log';

import { format } from './format.processor';
import * as routesUtils from '../../utils';

const DEFAULT_MIME_TYPE = 'application/x-ws+json';
const MIME_TYPE_MAPPINGS = {
  wsJson: 'application/x-ws+json',
  csv: 'application/csv',
};

export {
  formatMiddleware
};

function formatMiddleware(req, res) {
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
}

function streamOrSend(data, response) {
  if (data instanceof Readable) {
    data.pipe(response);
  } else {
    return response.send(data);
  }
}
