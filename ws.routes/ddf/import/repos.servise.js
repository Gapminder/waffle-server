'use strict';

const _ = require('lodash');

const express = require('express');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');

module.exports = {
  cloneRepo,
  getPathToRepo
};

function cloneRepo(githubUrl, onCloned, config) {
  if (!githubUrl) {
    return onCloned('Github url was not given');
  }

  const pathToRepo = getPathToRepo(githubUrl, config);
  fs.exists(pathToRepo, exists => {
    if (!exists) {
      shell.exec(`git clone ${githubUrl} ./${config.PATH_TO_DDF_REPOSITORIES}/${getRepoName(githubUrl)}`);
      return onCloned(null, true);
    }
    return onCloned(null, false);
  });
}

function getRepoName(githubUrl) {
  const partsOfGitHubUrl = githubUrl.split('/');
  const lastPart = _.last(partsOfGitHubUrl);
  return _.first(lastPart.split('.'));
}

function getPathToRepo(githubUrl, config) {
  if (!githubUrl) {
    return githubUrl;
  }
  return path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, getRepoName(githubUrl));
}
