import * as compression from 'compression';
import * as cors from 'cors';
import * as express from 'express';
import * as routeUtils from '../utils';
import * as AssetsController from './assets.controller';
import { ServiceLocator } from '../../ws.service-locator/index';
import { Application } from 'express';
import { createDiagnostics } from '../ddfql/ddfql.controller';

function registerDdfAssetsRoutes(serviceLocator: ServiceLocator): Application {
  const router = express.Router();
  const config = serviceLocator.get('config');

  router.use(cors());

  router.use('*',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    createDiagnostics,
    routeUtils.bodyFromUrlAssets,
    routeUtils.parseDatasetVersion,
    AssetsController.serveAsset
  );

  const app = serviceLocator.getApplication();
  return app.use('/api/ddf/assets', router);
}

export {
  registerDdfAssetsRoutes
};
