'use strict';

const _ = require('lodash');
const wsCli = require('waffle-server-import-cli');

const e2eEnv = require('./e2e.env');
const e2eUtils = require('./e2e.utils');
e2eUtils.setUpEnvironmentVariables();

require('../ws.config/db.config');
require('../ws.repository');

const CACHED_COMMITS = new WeakMap();

const DEFAULT_WS_CLI_OPTIONS = {
  ws_port: e2eEnv.wsPort,
  pass: e2eEnv.pass,
  login: e2eEnv.login,
  repo: e2eEnv.repo
};

module.exports = {
  setDefaultCommit,
  runDatasetImport,
  getCommitByGithubUrl
};

function runDatasetImport(commitIndexToStartImport = 0, onIncrementalUpdateDone) {
  return getCommitsByGithubUrl(DEFAULT_WS_CLI_OPTIONS.repo, (error, commits) => {
    if (error) {
      return done(error);
    }

    const allowedCommits = _.drop(commits, commitIndexToStartImport);
    const finishCommitIndex = commitIndexToStartImport ? 4 - commitIndexToStartImport : _.size(allowedCommits);
    const cliOptions = _.extend({from: _.first(allowedCommits), to: _.nth(allowedCommits, finishCommitIndex)}, DEFAULT_WS_CLI_OPTIONS);

    wsCli.importUpdate(cliOptions, error => {
      if (error) {
        return onIncrementalUpdateDone(error);
      }
      return onIncrementalUpdateDone();
    });
  });
}

function setDefaultCommit(commit, options, done) {
  if (_.isFunction(options)) {
    done = options;
    options = {};
  }

  options = _.defaults(options, DEFAULT_WS_CLI_OPTIONS, {commit});
  wsCli.setDefault(options, error => {
    if (error) {
      return done(error);
    }
    console.log(`Default commit is set: ${commit}`);
    return done();
  });
}

function getCommitByGithubUrl(githubUrl, index, done) {
  return getCommitsByGithubUrl(githubUrl, (error, commits) => {
    if (error) {
      return done(error);
    }

    return done(error, commits[index]);
  });
}

function getCommitsByGithubUrl(githubUrl, done) {
  let githubUrlObj = {githubUrl: githubUrl};

  if (CACHED_COMMITS.has(githubUrl)) {
    return done(null, CACHED_COMMITS.get(githubUrlObj));
  }

  wsCli.getCommitListByGithubUrl(githubUrl, (error, commits) => {
    if (error) {
      return done(error);
    }

    CACHED_COMMITS.set(githubUrlObj, commits);
    return done(null, CACHED_COMMITS.get(githubUrlObj));
  })
}
