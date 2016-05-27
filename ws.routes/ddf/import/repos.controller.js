'use strict';

var express = require('express');
var shell = require('shelljs');

let gitHubUrl = 'git@github.com:valor-software/ddf--gapminder_world-stub-1.git';
let gitCommit = 'aafed7d4dcda8d736f317e0cd3eaff009275cbb6';

module.exports = serviceLocator => {
  let app = serviceLocator.getApplication();
  var router = express.Router();

  router.get('/api/ddf/import/repo', cloneRepositories);
  return app.use(router);
};

function cloneRepositories() {
  shell.exec(`cd csv_data_mapping_cli/repos`);
  shell.exec(`git clone ${gitHubUrl}`);
  shell.exec(`git checkout ${gitCommit}`);
}
