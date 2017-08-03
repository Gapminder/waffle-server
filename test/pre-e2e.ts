/* tslint:disable:no-console */

import * as e2eUtils from './e2e.utils';
import { e2eEnv } from './e2e.env';
import * as cliUtils from './cli.utils';
import { logger } from '../ws.config/log';
import * as shell from 'shelljs';
import { syncFn } from 'synchronize';

logger.info('==========================================');
logger.info('Starting e2e tests');
logger.info('==========================================');

const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

e2eUtils.setUpEnvironmentVariables();

e2eUtils.dropMongoDb();
e2eUtils.stopWaffleServer();
e2eUtils.startWaffleServer();

shell.exec('sleep 20');

process.on('SIGINT', () => {
  console.log('Caught interrupt signal');
  e2eUtils.stopWaffleServer();
  process.exit(0);
});

const importOptions: cliUtils.ImportOptions = {
  repos: [
    {
      url: e2eEnv.repo,
      commitIndexToStartImport: +COMMIT_INDEX_TO_IMPORT
    },
    {
      url: e2eEnv.repo2,
      commitIndexToStartImport: 9
    }
  ]
};

syncFn(cliUtils.runDatasetImport.bind(cliUtils))(importOptions, (error: string) => {
  if (error) {
    e2eUtils.stopWaffleServer();
    process.exit(1);
  }
  process.exit(0);
});
