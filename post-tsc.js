#!/usr/bin/env node

const shell = require('shelljs');
const fs = require('fs');
const async = require('async');

shell.cp('-R', 'ws.routes/adapter/fixtures', 'dist/ws.routes/adapter/fixtures');
shell.exec('cp $(find . -name \'*.json\') --parents dist');
shell.cp(['.foreverignore', 'make-default-user.js', 'newrelic.js'], 'dist');

async.waterfall([
  async.apply(createDirectory, 'dist/ws.import/diffs'),
  async.apply(createDirectory, 'dist/logs'),
], (error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
});

function createDirectory(directoryName, cb) {
  return fs.stat(directoryName, (error) => {
    if (error) {
      if (error.code === 'ENOENT') {
        shell.mkdir(directoryName);
      } else {
        return cb(error);
      }
    }

    return cb();
  })
}
