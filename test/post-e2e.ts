/* tslint:disable:no-console */

import * as e2eUtils from './e2e.utils';

console.log('==========================================');
console.log('e2e tests are completed - shutting down WS');
console.log('==========================================\n');

e2eUtils.stopWaffleServer((error: string) => {
  if (error) {
    console.error(error);
    process.exit(1);
    return;
  }

  e2eUtils.dropMongoDb((_error: string) => {
    if (_error) {
      console.error(_error);
      process.exit(1);
      return;
    }

    process.exit(0);
  });
});
