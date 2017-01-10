'use strict';

const cors = require('cors');
const express = require('express');
const compression = require('compression');

const routeUtils = require('../../utils');
const cliController = require('./cli.controller');

module.exports = serviceLocator => {
  const router = express.Router();

  router.use(cors());
  router.use(compression());

  // authentication route should be defined before router.use(passport.authenticate('token'));
  // cause it is entry point for acquiring token and requesting other resources
  router.post('/authenticate', cliController.getToken);

  router.use(routeUtils.ensureAuthenticatedViaToken);

  router.get('/prestored-queries', cliController.getAvailableDatasetsAndVersions);
  router.get('/git-commits-list', cliController.getGitCommitsList);
  router.get('/commit-of-latest-dataset-version', cliController.getCommitOfLatestDatasetVersion);
  router.get('/transactions/latest/status', cliController.getStateOfLatestTransaction);
  router.get('/datasets', cliController.getDatasets);
  router.get('/datasets/private', cliController.getPrivateDatasets);
  router.get('/datasets/removable', cliController.getRemovableDatasets);

  router.post('/update-incremental', cliController.updateIncrementally);
  router.post('/import-dataset', cliController.importDataset);
  router.post('/remove-dataset', cliController.removeDataset);
  router.post('/transactions/latest/rollback', cliController.activateRollback);
  router.post('/datasets/default', cliController.setDefaultDataset);
  router.post('/datasets/accessToken', cliController.generateDatasetAccessToken);
  router.post('/cache/clean', cliController.cleanCache);

  const app = serviceLocator.getApplication();
  return app.use('/api/ddf/cli', router);
};
