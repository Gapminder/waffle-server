import * as compression from 'compression';
import * as cors from 'cors';
import * as express from 'express';
import * as routeUtils from '../../utils';
import * as CliController from './cli.controller';
import {ServiceLocator} from '../../../ws.service-locator/index';
import {Application} from 'express';
import * as passport from 'passport';

function registerDdfCliRoutes(serviceLocator: ServiceLocator): Application {
  const router = express.Router();

  router.use(cors());
  router.use(passport.initialize());
  router.use(compression());
  router.use(routeUtils.trackingRequestTime);

  // authentication route should be defined before router.use(passport.authenticate('token'));
  // cause it is entry point for acquiring token and requesting other resources
  router.post('/authenticate', CliController.getToken);

  router.get('/recentQueries/status', CliController.getStateOfRecentQueries);

  router.use(routeUtils.ensureAuthenticatedViaToken);
  router.use(routeUtils.ensureCliVersion);

  router.get('/prestored-queries', CliController.getAvailableDatasetsAndVersions);
  router.get('/commit-of-latest-dataset-version', CliController.getCommitOfLatestDatasetVersion);
  router.get('/transactions/latest/status', CliController.getStateOfLatestTransaction);
  router.get('/datasets/removalStatus', CliController.getStateOfDatasetRemoval);
  router.get('/datasets', CliController.getDatasets);
  router.get('/datasets/private', CliController.getPrivateDatasets);
  router.get('/datasets/removable', CliController.getRemovableDatasets);
  router.get('/datasets/inProgress', CliController.getDatasetsInProgress);

  router.post('/update-incremental', CliController.updateIncrementally);
  router.post('/import-dataset', CliController.importDataset);
  router.post('/remove-dataset', CliController.removeDataset);
  router.post('/transactions/latest/rollback', CliController.activateRollback);
  router.post('/datasets/default', CliController.setDefaultDataset);
  router.post('/datasets/default/ml', CliController.setMongolessDefaultDataset);
  router.post('/datasets/accessToken', CliController.generateDatasetAccessToken);
  router.post('/cache/clean', CliController.cleanCache);
  router.post('/repos/clean', CliController.cleanRepos);

  const app = serviceLocator.getApplication();
  return app.use('/api/ddf/cli', router);
}

export {
  registerDdfCliRoutes
};
