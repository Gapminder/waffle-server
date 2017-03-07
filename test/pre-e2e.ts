import * as e2eUtils from './e2e.utils';

console.log('==========================================');
console.log('Starting e2e tests');
console.log('==========================================\n');

const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

e2eUtils.setUpEnvironmentVariables();

import * as shell from 'shelljs';
import {syncFn} from 'synchronize';

e2eUtils.dropMongoDb();
e2eUtils.stopWaffleServer();
e2eUtils.startWaffleServer();

shell.exec('sleep 20');

import * as cliUtils from './cli.utils';
process.on('SIGINT', () => {
  console.log('Caught interrupt signal');
  e2eUtils.stopWaffleServer();
  process.exit(0);
});

syncFn(cliUtils.runDatasetImport.bind(cliUtils))(COMMIT_INDEX_TO_IMPORT, (error: any) => {
  if (error) {
    e2eUtils.stopWaffleServer();
    process.exit(1);
  }
  process.exit(0);
});
