/* tslint:disable:no-console */

import * as e2eUtils from './e2e.utils';

console.log('==========================================');
console.log('e2e tests are completed - shutting down WS');
console.log('==========================================\n');

e2eUtils.setUpEnvironmentVariables();

e2eUtils.dropMongoDb((error: string) => {
  if (error) {
    console.error(error);
    process.exit(2);
    return;
  }
});

e2eUtils.stopWaffleServer((error: string) => {
  if (error) {
    console.error(error);
    process.exit(1);
    return;
  }
});

process.exit(0);
