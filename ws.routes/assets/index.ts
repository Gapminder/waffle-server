import * as compression from 'compression';
import * as cors from 'cors';
import * as express from 'express';
import * as routeUtils from '../utils';
import * as AssetsController from './assets.controller';
import { ServiceLocator } from '../../ws.service-locator/index';
import { Application } from 'express';

function registerDdfAssetsRoutes(serviceLocator: ServiceLocator): Application {
  const router = express.Router();

  router.use(cors());

  router.use('*',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.bodyFromUrlAssets,
    AssetsController.serveAsset
  );

  const app = serviceLocator.getApplication();
  return app.use('/api/ddf/assets', router);
}

export {
  registerDdfAssetsRoutes
};
