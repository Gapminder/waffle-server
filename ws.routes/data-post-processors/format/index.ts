import {Readable} from 'stream';
import {logger} from '../../../ws.config/log';
import {format} from './format.processor';
import * as routesUtils from '../../utils';
import {WSRequest} from '../../utils';
import * as hi from 'highland';
import {Response} from 'express';

const DEFAULT_MIME_TYPE = 'application/json; charset=utf-8';
const MIME_TYPE_MAPPINGS = {
  wsJson: DEFAULT_MIME_TYPE,
  csv: 'application/csv'
};

export {
  formatMiddleware
};

function formatMiddleware(req: any, res: any): void {
  let formatType = req.query.format;
  const data = req.rawData;
  data.type = req.ddfDataType;

  logger.debug(`transform requested data in choosen ${formatType || 'default'} format`);

  return format(data, formatType, (err: string, packedData: any) => {
    if (err) {
      logger.error(err);
      res.use_express_redis_cache = false;
      return res.json(routesUtils.toErrorResponse(err, req, 'formatMiddleware'));
    }

    if (MIME_TYPE_MAPPINGS[formatType] === MIME_TYPE_MAPPINGS.csv) {
      res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
    }
    res.setHeader('Content-Type', MIME_TYPE_MAPPINGS[formatType] || DEFAULT_MIME_TYPE);

    return streamOrSend(packedData, req, res);
  });
}

function streamOrSend(data: any, req: WSRequest, response: Response,): Response {
  if (data instanceof Readable) {
    return data.pipe(response);
  } else if (hi.isStream(data)) {
    return data.toCallback((error: string, result: any) => {
      if (error) {
        return response.json(routesUtils.toErrorResponse(error, req, 'streamOrSend'));
      }
      return response.json(result);
    });
  } else {
    return response.send(data);
  }
}
