'use strict';

const _ = require('lodash');
const fs = require('fs');
const async = require('async');
const path = require('path');
const mkdirp = require('mkdirp');
const express = require('express');

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

  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);
  const pathToRepo = getPathToRepoFromGithubUrlDescriptor(githubUrlDescriptor);

  return fs.exists(pathToRepo, exists => {
    if (!exists) {
      return mkdirp(pathToRepo, createReposDirError => {
        if (createReposDirError) {
          logger.error(createReposDirError);
          return onCloned(`Cannot clone repo from ${githubUrl}`);
        }

        return _cloneRepo(githubUrlDescriptor, pathToRepo, commit, onCloned);
      });
    }
    return checkoutRepo(githubUrlDescriptor, pathToRepo, commit, onCloned);
  });
}

function _cloneRepo(githubUrlDescriptor, pathToRepo, commit, onCloned) {
  const {repo, branch, url: githubUrl} = githubUrlDescriptor;

  if (!repo) {
    return onCloned(`Incorrect github url was given`);
  }

  logger.info(`** Start cloning dataset: ${githubUrl}`);
  return git(path.resolve(config.PATH_TO_DDF_REPOSITORIES))
    .clone(githubUrl, pathToRepo, [`-b`, branch], cloneError => {
    if (cloneError) {
      logger.error(cloneError);
      return onCloned(`Cannot clone repo from ${githubUrl}`);
    }

    logger.info(`** Dataset has been cloned: ${githubUrl}`);
    return checkoutRepo(githubUrlDescriptor, pathToRepo, commit, onCloned);
  });
}

function checkoutRepo({branch, url: githubUrl}, pathToRepo, commit, onCheckedOut) {
  git(pathToRepo)
    .fetch('origin', branch, (fetchError) => {
      if (fetchError) {
        logger.error(fetchError);
        return onCheckedOut(`Cannot fetch branch '${branch}' from repo ${githubUrl}`);
      }
    })
    .reset(['--hard', `origin/${branch}`], (resetError) => {
      if (resetError) {
        logger.error(resetError);
        return onCheckedOut(`Cannot reset repo from ${githubUrl}`);
      }
    })
    .clean('f', (cleanError) => {
      if (cleanError) {
        logger.error(cleanError);
        return onCheckedOut(`Cannot clean repo from ${githubUrl}`);
      }
    })
    .checkout([commit || 'HEAD'], function (checkoutError) {
      if (checkoutError) {
        logger.error(checkoutError);
        return onCheckedOut(`Cannot checkout to branch '${branch}' in repo from ${githubUrl}`);
      }

      return onCheckedOut(null, {pathToRepo});
    });
}

function getRepoNameForDataset(githubUrl) {
  const {account, repo, branch} = getGithubUrlDescriptor(githubUrl);

  if (!account || !repo) {
    return null;
  }

  const accountAndName = `${account}/${repo}`;
  return branch && branch !== 'master' ? `${accountAndName}#${branch}` : accountAndName;
}

function getGithubUrlDescriptor(githubUrl) {
  const [githubUrlChunk, branch = 'master'] = _.split(githubUrl, '#');

  const [account = '', repo = ''] = _.chain(githubUrlChunk)
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
    url: githubUrlChunk,
    repo,
    account,
    branch
  };
}

function getPathToRepo(githubUrl) {
  if (!githubUrl) {
    return githubUrl;
  }
  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);
  return getPathToRepoFromGithubUrlDescriptor(githubUrlDescriptor);
}

function getPathToRepoFromGithubUrlDescriptor({account, repo, branch}) {
  return path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, account, repo, branch);
}
