import { Readable } from 'stream';
import { logger } from '../../../ws.config/log';

import { format } from './format.processor';
import * as routesUtils from '../../utils';
import * as hi from 'highland';

const DEFAULT_MIME_TYPE = 'application/json; charset=utf-8';
const MIME_TYPE_MAPPINGS = {
  wsJson: DEFAULT_MIME_TYPE,
  csv: 'application/csv',
};

export {
  formatMiddleware
};

function formatMiddleware(req, res) {
  let formatType = req.query.format;
  const data = req.rawData;
  data.type = req.ddfDataType;

  logger.debug(`transform requested data in choosen ${formatType || 'default'} format`);

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
    return data.pipe(response);
  } else if (hi.isStream(data)) {
    return data.toCallback((error, result) => {
      if (error) {
        return response.json(routesUtils.toErrorResponse(error));
      }
      return response.json(result);
    });
  } else {
    return response.send(data);
  }
}
