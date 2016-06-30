'use strict';

const _ = require('lodash');

const express = require('express');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const git = require('simple-git');

module.exports = {
  cloneRepo,
  getRepoName,
  getPathToRepo
};

function cloneRepo(githubUrl, commit, onCloned, config) {
  if (!githubUrl) {
    return onCloned('Github url was not given');
  }

  const pathToRepo = getPathToRepo(githubUrl, config);
  fs.exists(pathToRepo, exists => {
    if (!exists) {
      const repoName = getRepoName(githubUrl);
      if (!repoName) {
        return onCloned(`Incorrect github url was given: ${githubUrl}`);
      }
      shell.exec(`git clone ${githubUrl} ./${config.PATH_TO_DDF_REPOSITORIES}/${repoName}`);
    }

    return git(pathToRepo)
      .fetch('origin', 'master')
      .reset(['--hard', 'origin/master'])
      .checkout(commit || 'HEAD', function (err) {
        return onCloned(err, {pathToRepo});
      });
  });
}

function getRepoName(githubUrl) {
  const partsOfGitHubUrl = _.split(githubUrl, '/');
  const lastPart = _.last(partsOfGitHubUrl);
  return _.first(_.split(lastPart, '.'));
}

function getPathToRepo(githubUrl, config) {
  if (!githubUrl) {
    return githubUrl;
  }
  return path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, getRepoName(githubUrl));
}
