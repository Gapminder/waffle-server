import * as _ from 'lodash';
import * as fs from 'fs';
import * as async from 'async';
import * as git from 'simple-git';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { config } from '../ws.config/config';
import { logger } from '../ws.config/log';
import * as shell from 'shelljs';
import { ChildProcess } from 'child_process';

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
  const { pathToRepo, isDestinationDir } = externalContext;

  if (!isDestinationDir) {
    return mkdirp(pathToRepo, (createReposDirError: any) => onCreated(createReposDirError, externalContext));
  }

  return async.setImmediate(() => onCreated(null, externalContext));
}

function _cleanDestinationDirIfExists(externalContext: any, onRemoved: Function): ChildProcess | void {
  const { pathToRepo, isGitDir } = externalContext;

  if (!isGitDir) {
    return shell.exec(`rm -rf ${pathToRepo}`, (code: number, stdout: string, stderr: string) => {
      logger.debug('Exit code:', code);
      logger.debug('Program output:', stdout);
      logger.debug('Program stderr:', stderr);

      if (code !== 0) {
        return onRemoved(`Error: cleaning repo directory '${pathToRepo}' was failed`);
      }

      return onRemoved(null, externalContext);
    });
  }

  return async.setImmediate(() => onRemoved(null, externalContext));
}

function _cloneRepoIfDirectoryEmpty(externalContext: any, onCloned: Function): void {
  const { githubUrlDescriptor: { repo, branch, url: githubUrl }, pathToRepo, isGitDir } = externalContext;
  if (!repo) {
    return onCloned(`Incorrect github url was given`);
  }

  logger.info(`** Start cloning dataset: ${githubUrl}`);

  if (!isGitDir) {
    return git(config.PATH_TO_DDF_REPOSITORIES).clone(githubUrl, pathToRepo, [`-b`, branch], (cloneError: any) => {
      if (cloneError) {
        return onCloned(cloneError);
      }

      logger.info(`** Dataset has been cloned: ${githubUrl}`);
      return onCloned(null, externalContext);
    });
  }

  return async.setImmediate(() => onCloned(null, externalContext));
}

function _checkoutToGivenCommit(externalContext: any, onCheckedOut: Function): void {
  const { githubUrlDescriptor: { branch, url: githubUrl }, pathToRepo, commit } = externalContext;

  const gitRepo = git(pathToRepo);

  logger.info(`** Start checkout dataset commit: ${githubUrl}`);

  return async.series([
    async.apply(gitRepo.reset.bind(gitRepo), ['--hard', `origin/${branch}`]),
    async.apply(gitRepo.checkout.bind(gitRepo), ['master']),
    async.apply(gitRepo.pull.bind(gitRepo)),
    async.apply(gitRepo.clean.bind(gitRepo), 'f'),
    async.apply(gitRepo.checkout.bind(gitRepo), [branch]),
    async.apply(gitRepo.pull.bind(gitRepo), 'origin', branch),
    async.apply(gitRepo.checkout.bind(gitRepo), [commit || 'HEAD'])
  ], (error: string) => {
    if (error) {
      return onCheckedOut(`${error} on branch ${branch} and commit ${commit || 'HEAD'}`);
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
