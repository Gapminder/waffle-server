'use strict';

console.log('==========================================');
console.log('e2e tests are completed - shutting down WS');
console.log('==========================================\n');

const e2eUtils = require('./e2e.utils');

e2eUtils.stopWaffleServer();
e2eUtils.dropMongoDb();

process.exit(0);
