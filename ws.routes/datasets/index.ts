import * as cors from 'cors';
import * as express from 'express';
import * as routeUtils from '../utils';
import * as DatasetsController from './datasets.controller';
import { ServiceLocator } from '../../ws.service-locator/index';
import { Application } from 'express';

function registerDatasetsRoutes(serviceLocator: ServiceLocator): Application {
  const router = express.Router();

  router.use(cors());

  router.get('/config',
    routeUtils.trackingRequestTime,
    DatasetsController.updateConfig.bind(DatasetsController, false)
  );

  router.put('/config',
    routeUtils.trackingRequestTime,
    DatasetsController.updateConfig.bind(DatasetsController, true)
  );

  const app = serviceLocator.getApplication();
  return app.use('/api/datasets/', router);
}

export {
  registerDatasetsRoutes
};
