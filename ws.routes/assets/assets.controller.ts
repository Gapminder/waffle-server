import { Request, Response } from 'express';
import * as _ from 'lodash';
import { constants } from '../../ws.utils/constants';

export {
  serveAsset
};

function serveAsset(req: Request, res: Response): void {
  const assetDescriptor: any = _.get(req.body, 'assetDescriptor');
  if (!assetDescriptor) {
    return res.status(200).end();
  }

  res.setHeader('Content-Disposition', `attachment; filename=${assetDescriptor.filename}`);
  res.sendFile(assetDescriptor.filepath, { maxAge: constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS });
}
