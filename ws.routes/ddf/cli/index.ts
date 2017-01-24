import * as cors from 'cors';
import * as express from 'express';
import * as compression from 'compression';

import * as routeUtils from '../../utils';
import * as CliController from './cli.controller';

function registerDdfCliRoutes(serviceLocator) {
  const router = express.Router();

  router.use(cors());
  router.use(compression());

  // authentication route should be defined before router.use(passport.authenticate('token'));
  // cause it is entry point for acquiring token and requesting other resources
  router.post('/authenticate', CliController.getToken);

  router.use(routeUtils.ensureAuthenticatedViaToken);

  router.get('/prestored-queries', CliController.getAvailableDatasetsAndVersions);
  router.get('/git-commits-list', CliController.getGitCommitsList);
  router.get('/commit-of-latest-dataset-version', CliController.getCommitOfLatestDatasetVersion);
  router.get('/transactions/latest/status', CliController.getStateOfLatestTransaction);
  router.get('/datasets', CliController.getDatasets);
  router.get('/datasets/private', CliController.getPrivateDatasets);
  router.get('/datasets/removable', CliController.getRemovableDatasets);
  router.get('/datasets/inProgress', CliController.getDatasetsInProgress);

  router.post('/update-incremental', CliController.updateIncrementally);
  router.post('/import-dataset', CliController.importDataset);
  router.post('/remove-dataset', CliController.removeDataset);
  router.post('/transactions/latest/rollback', CliController.activateRollback);
  router.post('/datasets/default', CliController.setDefaultDataset);
  router.post('/datasets/accessToken', CliController.generateDatasetAccessToken);
  router.post('/cache/clean', CliController.cleanCache);

  const app = serviceLocator.getApplication();
  return app.use('/api/ddf/cli', router);
}

export {
  registerDdfCliRoutes
}
