import * as _ from 'lodash';
import * as wsCli from 'waffle-server-import-cli';
import { e2eEnv } from './e2e.env';
import * as e2eUtils from './e2e.utils';

e2eUtils.setUpEnvironmentVariables();

import '../ws.config/db.config';
import '../ws.repository';

const CACHED_COMMITS = new WeakMap();

const DEFAULT_WS_CLI_OPTIONS = {
  ws_port: e2eEnv.wsPort,
  pass: e2eEnv.pass,
  login: e2eEnv.login,
  repo: e2eEnv.repo
};

export {
  setDefaultCommit,
  runDatasetImport,
  getCommitByGithubUrl
};

function runDatasetImport(commitIndexToStartImport = 0, onIncrementalUpdateDone) {
  return getCommitsByGithubUrl(DEFAULT_WS_CLI_OPTIONS.repo, (error, commits) => {
    if (error) {
      return onIncrementalUpdateDone(error);
    }

    const allowedCommits = _.drop(commits, commitIndexToStartImport);
    const finishCommitIndex = commitIndexToStartImport ? 3 - commitIndexToStartImport : _.size(allowedCommits);
    const cliOptions = _.extend({from: _.first(allowedCommits), to: _.get(allowedCommits, `${finishCommitIndex}`)}, DEFAULT_WS_CLI_OPTIONS);

    wsCli.importUpdate(cliOptions, error => {
      if (error) {
        return onIncrementalUpdateDone(error);
      }
      return onIncrementalUpdateDone();
    });
  });
}

function setDefaultCommit(commit, options?, done?) {
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
  });
}
