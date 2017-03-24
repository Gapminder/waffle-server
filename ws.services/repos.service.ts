import * as _ from 'lodash';
import * as fs from 'fs';
import * as git from 'simple-git';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import {config} from '../ws.config/config';
import {logger} from '../ws.config/log';

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

function cloneRepo(githubUrl: string, commit: string, onCloned: Function): void {
  if (!githubUrl) {
    return onCloned('Github url was not given');
  }

  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);
  const pathToRepo = getPathToRepoFromGithubUrlDescriptor(githubUrlDescriptor);

  return fs.exists(pathToRepo, (exists: boolean) => {
    if (!exists) {
      return mkdirp(pathToRepo, (createReposDirError: any) => {
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

function _cloneRepo(githubUrlDescriptor: GithubUrlDescriptor, pathToRepo: string, commit: string, onCloned: Function): void {
  const {repo, branch, url: githubUrl} = githubUrlDescriptor;

  if (!repo) {
    return onCloned(`Incorrect github url was given`);
  }

  logger.info(`** Start cloning dataset: ${githubUrl}`);
  return git(path.resolve(config.PATH_TO_DDF_REPOSITORIES))
    .clone(githubUrl, pathToRepo, [`-b`, branch], (cloneError: any) => {
    if (cloneError) {
      logger.error(cloneError);
      return onCloned(`Cannot clone repo from ${githubUrl}`);
    }

    logger.info(`** Dataset has been cloned: ${githubUrl}`);
    return checkoutRepo(githubUrlDescriptor, pathToRepo, commit, onCloned);
  });
}

function checkoutRepo({branch, url: githubUrl}: GithubUrlDescriptor, pathToRepo: string, commit: string, onCheckedOut: Function): void {
  git(pathToRepo)
    .fetch('origin', branch, (fetchError: any) => {
      if (fetchError) {
        logger.error(fetchError);
        return onCheckedOut(`Cannot fetch branch '${branch}' from repo ${githubUrl}`);
      }
    })
    .reset(['--hard', `origin/${branch}`], (resetError: any) => {
      if (resetError) {
        logger.error(resetError);
        return onCheckedOut(`Cannot reset repo from ${githubUrl}`);
      }
    })
    .clean('f', (cleanError: any) => {
      if (cleanError) {
        logger.error(cleanError);
        return onCheckedOut(`Cannot clean repo from ${githubUrl}`);
      }
    })
    .checkout([commit || 'HEAD'], (checkoutError: any) => {
      if (checkoutError) {
        logger.error(checkoutError);
        return onCheckedOut(`Cannot checkout to branch '${branch}' in repo from ${githubUrl}`);
      }

      return onCheckedOut(null, {pathToRepo});
    });
}

function getRepoNameForDataset(githubUrl: string): string {
  const {account, repo, branch} = getGithubUrlDescriptor(githubUrl);

  if (!account || !repo) {
    return null;
  }

  const accountAndName = `${account}/${repo}`;
  return branch && branch !== 'master' ? `${accountAndName}#${branch}` : accountAndName;
}

function getGithubUrlDescriptor(githubUrl: string): GithubUrlDescriptor {
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

function getPathToRepo(githubUrl: string): string {
  if (!githubUrl) {
    return githubUrl;
  }
  const githubUrlDescriptor = getGithubUrlDescriptor(githubUrl);
  return getPathToRepoFromGithubUrlDescriptor(githubUrlDescriptor);
}

function getPathToRepoFromGithubUrlDescriptor({account, repo, branch}: GithubUrlDescriptor): string {
  return path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, account, repo, branch);
}
