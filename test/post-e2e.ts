import * as e2eUtils from './e2e.utils';

console.log('==========================================');
console.log('e2e tests are completed - shutting down WS');
console.log('==========================================\n');

e2eUtils.stopWaffleServer();
e2eUtils.dropMongoDb();

process.exit(0);
