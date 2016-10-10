'use strict';

const _ = require('lodash');

const express = require('express');
const fs = require('fs');
const path = require('path');

const config = require('../ws.config/config');
const logger = require('../ws.config/log');

const git = require('simple-git');

module.exports = {
  cloneRepo,
  getRepoNameForDataset,
  getPathToRepo
};

function cloneRepo(githubUrl, commit, onCloned) {
  if (!githubUrl) {
    return onCloned('Github url was not given');
  }

  const pathToRepo = getPathToRepo(githubUrl);

  return fs.exists(pathToRepo, exists => {
    if (!exists) {
      return fs.exists(config.PATH_TO_DDF_REPOSITORIES, existsPathToRepos => {
        if (!existsPathToRepos) {
          return fs.mkdir(config.PATH_TO_DDF_REPOSITORIES, createReposDirError => {
            if (createReposDirError) {
              logger.error(createReposDirError);
              return onCloned(`Cannot clone repo from ${githubUrl}`);
            }

            return _cloneRepo(githubUrl, commit, pathToRepo, onCloned);
          });
        }

        return _cloneRepo(githubUrl, commit, pathToRepo, onCloned);
      });
    }

    return checkoutRepo(pathToRepo, commit, onCloned);
  });
}

function _cloneRepo(githubUrl, commit, pathToRepo, onCloned) {
  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);

  if (!githubUrlDescriptor.repo) {
    return onCloned(`Incorrect github url was given: ${githubUrl}`);
  }

  return git(path.resolve(config.PATH_TO_DDF_REPOSITORIES))
    .clone(githubUrl, pathToRepo, cloneError => {
    if (cloneError) {
      logger.error(cloneError);
      return onCloned(`Cannot clone repo from ${githubUrl}`);
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

function getRepoNameForDataset(githubUrl) {
  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);
  if (!githubUrlDescriptor.account || !githubUrlDescriptor.repo) {
    return null;
  }

  return `${githubUrlDescriptor.account}/${githubUrlDescriptor.repo}`;
}

function getGithubUrlDescriptor(githubUrl) {
  const accountAndRepoNames = _.chain(githubUrl)
    .split(':')
    .last()
    .split('/')
    .map(name => {
      if (_.endsWith(name, '.git')) {
        return name.slice(0, name.indexOf('.git'));
      }
      return name;
    }).value();

  return {
    account: _.first(accountAndRepoNames),
    repo: _.last(accountAndRepoNames)
  };
}

function getPathToRepo(githubUrl) {
  if (!githubUrl) {
    return githubUrl;
  }
  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);
  return path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, githubUrlDescriptor.account, githubUrlDescriptor.repo);
}
