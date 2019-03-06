import { Response } from 'express';
import * as _ from 'lodash';
import { performance } from 'perf_hooks';
import { logger } from '../../ws.config/log';
import * as routesUtils from '../utils';
import { WSRequest } from '../utils';
import { prepareDDFCsvReaderObject } from 'vizabi-ddfcsv-reader';
import { GcpFileReader } from 'gcp-ddf-resource-reader';
import { constants, responseMessages } from '../../ws.utils/constants';
import { config } from '../../ws.config/config';
import { getCacheTagValue } from '../ddfql/ddfql.controller';

export {
  serveAsset
};

async function serveAsset(req: WSRequest, res: Response): Promise<Response | void> {
  const query: any = _.get(req, 'body', {});
  const cacheTag = getCacheTagValue(req);

  if (cacheTag) {
    res.set('Cache-Tag', cacheTag);
  }

  if (_.isEmpty(query)) {
    return res.status(200).end();
  }

  req.queryStartTime = performance.now();

  try {
    const reader = prepareDDFCsvReaderObject(new GcpFileReader())();
    reader.init({path: query.repositoryPath});
    const data = await reader.getAsset(query.filepath);

    res.setHeader('Content-Disposition', `attachment; filename=${query.filename}`);
    res.setHeader('Content-type', 'text/plain');
    res.charset = 'UTF-8';
    res.set('Cache-Control', `public, max-age=${constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS}, s-maxage=${constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS}`);

    return res.send(data);
  } catch(error) {
    logger.error(error);

    if (config.IS_LOCAL) {
      return res.json(routesUtils.toErrorResponse(error, req, 'vizabi-ddfcsv-reader'));
    }
    return res.json(routesUtils.toErrorResponse(responseMessages.MALFORMED_URL, req));
  }
}
