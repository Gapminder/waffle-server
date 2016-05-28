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

  shell.exec(` git clone ${gitHubUrl} ./csv_data_mapping_cli/repos`);

  // - git checkout, должна выполняться в контекст (папке) с репозиторием.
  // - есть путь к репозиторию, нужно получить имя папки ( split + split || regexp)
  // - вторая команда с checkout сделать по аналогии с оператором &&

  shell.exec(`git checkout ${gitCommit}`);
}
