import { Request, Response } from 'express';
import * as _ from 'lodash';
import { constants } from '../../ws.utils/constants';

export {
  serveAsset
};

function serveAsset(req: Request, res: Response): void {
  const assetPathDescriptor: any = _.get(req.body, 'assetPathDescriptor');
  if (!assetPathDescriptor) {
    return res.status(200).end();
  }

  res.setHeader('Content-Disposition', `attachment; filename=${assetPathDescriptor.assetName}`);
  res.sendFile(assetPathDescriptor.path, { maxAge: constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS });
}
