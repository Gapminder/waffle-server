/* tslint:disable:no-console */

import * as e2eUtils from './e2e.utils';
import { e2eEnv } from './e2e.env';
import { logger } from '../ws.config/log';

console.log('==========================================');
console.log('Starting e2e tests');
console.log('==========================================\n');

const COMMIT_INDEX_TO_IMPORT: number = +process.env.COMMIT_INDEX_TO_IMPORT || 0;

e2eUtils.setUpEnvironmentVariables();

import * as shell from 'shelljs';
import {syncFn} from 'synchronize';

e2eUtils.dropMongoDb((error: string) => {
  if (error) {
    logger.warn(error);
    return;
  }
});

e2eUtils.stopWaffleServer((error: string) => {
  if (error) {
    logger.warn(error);
    return;
  }
});
e2eUtils.startWaffleServer();

shell.exec('sleep 20');

// import * as cliUtils from './cli.utils';

process.on('SIGINT', () => {
  logger.info('Caught interrupt signal');
  e2eUtils.stopWaffleServer((error: string) => {
    if (error) {
      logger.error(error);
      process.exit(1);
      return;
    }

    process.exit(0);
  });
});

// const importOptions: cliUtils.ImportOptions = {
//   repos: [
//     {
//       url: e2eEnv.repo,
//       commitIndexToStartImport: COMMIT_INDEX_TO_IMPORT
//     },
//     {
//       url: e2eEnv.repo2,
//       commitIndexToStartImport: 9
//     }
//   ]
// };

// syncFn(cliUtils.runDatasetImport.bind(cliUtils))(importOptions, (error: any) => {
//   if (error) {
//     logger.error(error);
//     process.exit(1);
//     return;
//   }
//
//   process.exit(0);
// });
