'use strict';

console.log('==========================================');
console.log('Starting e2e tests');
console.log('==========================================\n');

const e2eUtils = require('./e2e.utils');
e2eUtils.setUpEnvironmentVariables();

const shell = require('shelljs');
const sync = require('synchronize');

e2eUtils.dropMongoDb();
e2eUtils.stopWaffleServer();
e2eUtils.startWaffleServer();

shell.exec('sleep 12');

const cliUtils = require('./cli.utils');
process.on('SIGINT', () => {
  console.log("Caught interrupt signal");
  e2eUtils.stopWaffleServer();
  process.exit(0);
});

sync(cliUtils.runDatasetImport.bind(cliUtils))(error => {
  if (error) {
    e2eUtils.stopWaffleServer();
    process.exit(1);
  }
  process.exit(0);
});
