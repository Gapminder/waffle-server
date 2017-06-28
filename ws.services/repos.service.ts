import * as async from 'async';
import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import { CloneOptions, Options, reposService } from 'waffle-server-repo-service';
import { config } from '../ws.config/config';
import { logger } from '../ws.config/log';

export {
  cloneRepo,
  getRepoNameForDataset,
  getPathToRepo
};

interface GithubUrlDescriptor {
  url: string;
  repo: string;
  account: string;
  branch: string;
}

function getRepoNameForDataset(githubUrl: string): string {
  const { account, repo, branch } = _getGithubUrlDescriptor(githubUrl);

  if (!account || !repo) {
    return null;
  }

  const accountAndName = `${account}/${repo}`;
  return branch && branch !== 'master' ? `${accountAndName}#${branch}` : accountAndName;
}

function getPathToRepo(githubUrl: string): string {
  if (!githubUrl) {
    return githubUrl;
  }
  const githubUrlDescriptor = _getGithubUrlDescriptor(githubUrl);
  return _getPathToRepoFromGithubUrlDescriptor(githubUrlDescriptor);
}

function cloneRepo(githubUrl: string, commit: string, onCloned: Function): void {
  if (!githubUrl) {
    return onCloned('Github url was not given');
  }

  const githubUrlDescriptor = _getGithubUrlDescriptor(githubUrl);
  const pathToRepo = _getPathToRepoFromGithubUrlDescriptor(githubUrlDescriptor);
  const pathToGitDir = path.resolve(pathToRepo, '.git');

  return async.waterfall([
    async.constant({ pathToRepo, githubUrlDescriptor, commit }),
    async.apply(_checkIfDirExists, pathToRepo, 'isDestinationDir'),
    _createDestinationDirIfDoesntExist,
    async.apply(_checkIfDirExists, pathToGitDir, 'isGitDir'),
    _cleanDestinationDirIfExists,
    _cloneRepoIfDirectoryEmpty,
    _checkoutToGivenCommit
  ], (error: string) => {
    if (error) {
      logger.error(error);
      return onCloned(`${error} (repo url: ${githubUrl})`);
    }

    return onCloned(null, { pathToRepo });
  });
}

function _checkIfDirExists(pathToCheck: string, property: string, externalContext: any, onChecked: Function): void {

  return fs.exists(pathToCheck, (exists: boolean) => {
    externalContext[property] = exists;

    return onChecked(null, externalContext);
  });
}

function _createDestinationDirIfDoesntExist(externalContext: any, onCreated: Function): void {
  const { pathToRepo: pathToDir, isDestinationDir } = externalContext;

  if (!isDestinationDir) {
    return reposService.makeDirForce({ pathToDir }, (createReposDirError: string) => onCreated(createReposDirError, externalContext));
  }

  return async.setImmediate(() => onCreated(null, externalContext));
}

function _cleanDestinationDirIfExists(externalContext: any, onRemoved: Function): ChildProcess | void {
  const { pathToRepo: pathToDir, isGitDir } = externalContext;

  if (!isGitDir) {
    return reposService.removeDirForce({ pathToDir }, (error: string) => onRemoved(error, externalContext));
  }

  return async.setImmediate(() => onRemoved(null, externalContext));
}

function _cloneRepoIfDirectoryEmpty(externalContext: any, onCloned: Function): ChildProcess | void {
  const { githubUrlDescriptor: { repo, branch, url: githubUrl }, pathToRepo, isGitDir } = externalContext;

  if (!repo) {
    return onCloned(`Incorrect github url was given`);
  }

  logger.info(`** Start cloning dataset: ${githubUrl}`);

  const options: CloneOptions = {
    absolutePathToRepos: config.PATH_TO_DDF_REPOSITORIES,
    relativePathToRepo: pathToRepo,
    githubUrl,
    silent: true, async: true
  };

  if (!isGitDir) {
    return reposService.silentClone(options, (error: string) => onCloned(error, externalContext));
  }

  return async.setImmediate(() => onCloned(null, externalContext));
}

function _checkoutToGivenCommit(externalContext: any, onCheckedOut: Function): void {
  const { githubUrlDescriptor: { branch, url: githubUrl }, pathToRepo, commit = 'HEAD' } = externalContext;
  const options: Options = { branch, commit, pathToRepo: pathToRepo + '/', githubUrl, silent: true, async: true };

  logger.info(`** Start checkout dataset commit: ${githubUrl}`);
  return async.series([
    async.apply(reposService.fetch.bind(reposService), options),
    async.apply(reposService.reset.bind(reposService), options),
    async.apply(reposService.checkoutToBranch.bind(reposService), options),
    async.apply(reposService.pull.bind(reposService), options),
    async.apply(reposService.clean.bind(reposService), options),
    async.apply(reposService.checkoutToCommit.bind(reposService), options)
  ], (error: string) => {
    if (error) {
      return onCheckedOut(`${error} on branch ${branch} and commit ${commit}`);
    }

    logger.info(`** Dataset commit has been got: ${githubUrl}`);
    return onCheckedOut(null, { pathToRepo });
  });
}

function _getGithubUrlDescriptor(githubUrl: string): GithubUrlDescriptor {
  const [githubUrlChunk, branch = 'master'] = _.split(githubUrl, '#');

  const valuablePartOfGithubUrl: string = _.last(githubUrlChunk.split(':'));
  const [account = '', repo = ''] = _.chain(valuablePartOfGithubUrl)
    .split('/')
    .map((name: string) => {
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

function _getPathToRepoFromGithubUrlDescriptor({ account, repo, branch }: GithubUrlDescriptor): string {
  return path.resolve(config.PATH_TO_DDF_REPOSITORIES, account, repo, branch);
}
