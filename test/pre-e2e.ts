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

process.on('SIGINT', () => {
  console.log('Caught interrupt signal');
  e2eUtils.stopWaffleServer((error: string) => {
    if (error) {
      console.error(error);
      process.exit(1);
      return;
    }

    process.exit(0);
  });
});

e2eUtils.startWaffleServer( (error: string) => {
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
  const runDatasetImport = cliUtils.runDatasetImport.bind(cliUtils);

  runDatasetImport(importOptions, (datasetImportError: string) => {
    if (datasetImportError) {
      e2eUtils.stopWaffleServer((_error: string) => {
        if (_error) {
          console.error(_error);
        }
        console.error(datasetImportError);

        process.exit(1);
      });
    }

    process.exit(0);
  });

});
