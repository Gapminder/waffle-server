'use strict';

const _ = require('lodash');

const express = require('express');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');

let gitHubUrl = 'git@github.com:valor-software/ddf--gapminder_world-stub-1.git';
let gitCommit = 'aafed7d4dcda8d736f317e0cd3eaff009275cbb6';
let dirForRepos = 'csv_data_mapping_cli/repos';

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();
  const logger = app.get('log');
  const router = express.Router();

  router.get('/api/ddf/import/repo', cloneRepositories);
  return app.use(router);

  function cloneRepositories(req, res, next) {
    const pathToRepo = path.resolve(process.cwd(), dirForRepos, getDirName());
    fs.exists(pathToRepo, exists => {
      if (!exists) {
        shell.exec(`git clone ${gitHubUrl} ./${dirForRepos}/${getDirName()}`);
      }
      logger.warn(`Directory for cloning ${gitHubUrl} is already exist, hence repo won't be cloned`);
      return next();
    });

    function getDirName() {
      const partsOfGitHubUrl = gitHubUrl.split('/');
      const lastPart = _.last(partsOfGitHubUrl);
      return _.first(lastPart.split('.'));
    }
  }
};
