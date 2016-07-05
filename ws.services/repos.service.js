'use strict';

const _ = require('lodash');

const express = require('express');
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
      return git(config.PATH_TO_DDF_REPOSITORIES).clone(githubUrl, repoName, cloneError => {
        if (cloneError) {
          return onCloned(`Cannot clone repo from ${githubUrl}`);
        }

        return checkoutRepo(pathToRepo, commit, onCloned);
      });
    }

    return checkoutRepo(pathToRepo, commit, onCloned);
  });
}

function checkoutRepo(pathToRepo, commit, onCheckedOut) {
  git(pathToRepo)
    .fetch('origin', 'master')
    .reset(['--hard', 'origin/master'])
    .checkout(commit || 'HEAD', function (err) {
      return onCheckedOut(err, {pathToRepo});
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
