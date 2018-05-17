import { Response } from 'express';
import * as _ from 'lodash';
import { performance } from 'perf_hooks';
import { logger } from '../../ws.config/log';
import * as routesUtils from '../utils';
import { WSRequest } from '../utils';
import { getS3FileReaderObject } from '../../node_modules/vizabi-ddfcsv-reader/lib/src';
import * as path from 'path';
import { constants, responseMessages } from '../../ws.utils/constants';
import { config } from '../../ws.config/config';

export {
  serveAsset
};

function serveAsset(req: WSRequest, res: Response): void {
  const query: any = _.get(req, 'body', {});

  if (_.isEmpty(query)) {
    return res.status(200).end();
  }

  req.queryStartTime = performance.now();
  const reader = getS3FileReaderObject();

  reader.init({});
  reader.getAsset(path.join(query.repositoryPath, query.filepath)).then((data: any[]) => {
    res.setHeader('Content-Disposition', `attachment; filename=${query.filename}`);
    res.setHeader('Content-type', 'text/plain');
    res.charset = 'UTF-8';
    res.set('Cache-Control', `public, max-age=${constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS}, s-maxage=${constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS}`);
    res.send(data);
  }).catch((error: any) => {
    logger.error(error);
    if (config.IS_LOCAL) {
      return res.json(routesUtils.toErrorResponse(error, req, 'vizabi-ddfcsv-reader'));
    }
    return res.json(routesUtils.toErrorResponse(responseMessages.MALFORMED_URL, req));
  });
}
