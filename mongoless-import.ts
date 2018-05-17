import * as path from 'path';
import * as shell from 'shelljs';
import * as fsExtra from 'fs-extra';
import * as fs from 'fs';
import { constants } from './ws.utils/constants';
import { config } from './ws.config/config';
import { logger } from './ws.config/log';

import { keys, includes } from 'lodash';
import { repositoryDescriptors as repositoryDescriptorsSource } from './ws.config/mongoless-repos.config';

type RepositoryStateDescriptor = {
  url: string;
  name?: string;
  branch?: string;
  head?: string;
  commit?: string;
  path?: string;
  time?: string;
  issue?: string;
};

type CheckoutResult = {
  failedCommand?: string;
  error?: string;
  headCommitHash?: string;
};

type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type BranchIssue = { [key: string]: string };

const reposPath = path.resolve('.', 'ws.import', 'repos');
const repositories = keys(repositoryDescriptorsSource);

function normalizeRepositoryDescriptorsSource(): void {
  for (const repository of repositories) {
    const branches = keys(repositoryDescriptorsSource[repository]);

    if (!includes(branches, 'master')) {
      repositoryDescriptorsSource[repository].master = ['HEAD'];
    }
  }
}

function getRepositoryNameByUrl(repoUrl: string): string {
  try {
    return repoUrl.split(':')[1].replace(/\.git$/, '');
  } catch (error) {
    return null;
  }
}

async function checkoutToGivenCommit(repositoryStateDescriptor: RepositoryStateDescriptor): Promise<CheckoutResult> {
  const execCommand = (command: string): Promise<CommandResult> =>
    new Promise<CommandResult>((resolve: Function) => {
      const gitCommand =
        `git --git-dir=${repositoryStateDescriptor.path}/.git --work-tree=${repositoryStateDescriptor.path} ${command}`;

      shell.exec(gitCommand, { async: true }, (code: number, stdout: string, stderr: string) =>
        resolve({ code, stdout, stderr }));
    });

  const getHeadCommitHash = async (): Promise<CheckoutResult> => {
    const command = `rev-parse --verify HEAD`;
    const result = await execCommand(command);
    const SHORT_COMMIT_LENGTH = 7;

    if (result.code !== 0 || result.stdout.length < SHORT_COMMIT_LENGTH) {
      return { failedCommand: command, error: result.stderr };
    }

    return { headCommitHash: result.stdout.substr(0, SHORT_COMMIT_LENGTH) };
  };

  const commands = [
    `fetch --all --prune`,
    `reset --hard origin/${repositoryStateDescriptor.branch}`,
    `checkout ${repositoryStateDescriptor.branch}`,
    `pull origin ${repositoryStateDescriptor.branch}`,
    `clean -f -x`,
    `checkout ${repositoryStateDescriptor.commit}`
  ];

  for (const command of commands) {
    const result = await execCommand(command);

    if (result.code !== 0) {
      return new Promise<CheckoutResult>((resolve: Function) =>
        resolve({ failedCommand: command, error: result.stderr }));
    }
  }

  const headCommitHashResult = await getHeadCommitHash();

  return new Promise<CheckoutResult>((resolve: Function) => {
    if (headCommitHashResult.failedCommand || headCommitHashResult.error) {
      return resolve({ failedCommand: headCommitHashResult.failedCommand, error: headCommitHashResult.error });
    }

    resolve({ headCommitHash: headCommitHashResult.headCommitHash });
  });
}

async function initRepository(repositoryGitUrl: string, repositoryName: string): Promise<CommandResult> {
  const masterRepoPath = path.resolve(reposPath, repositoryName, 'master');
  const command = `git clone -v ${repositoryGitUrl} ${masterRepoPath}`;

  return new Promise<CommandResult>((resolve: Function) => {
    fsExtra.pathExists(masterRepoPath, (err: Error, exists: boolean) => {
      if (err) {
        return resolve({ code: 1, stdout: '', stderr: err });
      }

      if (exists) {
        return resolve({ code: 0, stdout: '', stderr: '' });
      }

      shell.exec(command, { async: true }, (code: number, stdout: string, stderr: string) =>
        resolve({ code, stdout, stderr }));
    });
  });
}

function makeBranchDraft(masterRepoPath: string, thisRepoPath: string): Promise<string> {
  return new Promise<string>((resolve: Function) => {
    fsExtra.pathExists(thisRepoPath, (err: Error, exists: boolean) => {
      if (err) {
        return resolve(err);
      }

      if (exists) {
        return resolve(err);
      }

      fsExtra.copy(masterRepoPath, thisRepoPath, (copyErr: Error) => resolve(copyErr));
    });
  });
}

async function makeBranchesDrafts(repositoryGitUrl: string, repositoryName: string): Promise<BranchIssue> {
  const issues = {};
  const branches = keys(repositoryDescriptorsSource[repositoryGitUrl]);

  for (const branch of branches) {
    if (branch === 'master') {
      continue;
    }

    for (const commit of repositoryDescriptorsSource[repositoryGitUrl][branch]) {
      const masterRepoPath = path.resolve(reposPath, repositoryName, 'master');
      const thisRepoPath = commit !== 'HEAD' ?
        path.resolve(reposPath, repositoryName, `${branch}-${commit}`) :
        path.resolve(reposPath, repositoryName, `${branch}`);
      const issue = await makeBranchDraft(masterRepoPath, thisRepoPath);

      if (issue) {
        issues[thisRepoPath] = issue;
      }
    }
  }

  return new Promise<BranchIssue>((resolve: Function) => resolve(issues));
}

export async function getRepositoryStateDescriptors(repository: string): Promise<RepositoryStateDescriptor[]> {
  const result: RepositoryStateDescriptor[] = [];
  const repoName = getRepositoryNameByUrl(repository);
  const finishThisAction = (lockFileToRemove?: string) => {
    if (lockFileToRemove) {
      fsExtra.removeSync(lockFileToRemove);
    }

    return new Promise<RepositoryStateDescriptor[]>((resolve: Function) => resolve(result));
  };

  if (!repoName) {
    result.push({ url: repository, issue: 'unknown repository' });

    return finishThisAction();
  }

  const lockFileName = repoName.replace(/\//, '-');
  const lockFilePath = path.resolve('.', 'ws.import', 'repos', `${lockFileName}.lock`);

  fsExtra.writeFileSync(lockFilePath, '');

  const initRepositoryResult = await initRepository(repository, repoName);

  if (initRepositoryResult.code !== 0) {
    result.push({
      url: repository,
      name: repoName,
      branch: 'master',
      issue: `Error during cloning: ${initRepositoryResult.stderr}`
    });

    return finishThisAction(lockFilePath);
  }

  const branchesIssuesHash = await makeBranchesDrafts(repository, repoName);
  const branches = keys(repositoryDescriptorsSource[repository]);

  for (const branch of branches) {
    for (const commit of repositoryDescriptorsSource[repository][branch]) {
      const thisRepoPath = commit !== 'HEAD' ?
        path.resolve(reposPath, repoName, `${branch}-${commit}`) :
        path.resolve(reposPath, repoName, `${branch}`);
      const repositoryStateDescriptor: RepositoryStateDescriptor = {
        url: repository,
        name: repoName,
        branch,
        commit,
        path: thisRepoPath
      };

      if (branchesIssuesHash[thisRepoPath]) {
        repositoryStateDescriptor.issue = branchesIssuesHash[thisRepoPath];
        result.push(repositoryStateDescriptor);

        continue;
      }

      const commitResult: CheckoutResult = await checkoutToGivenCommit(repositoryStateDescriptor);

      if (commitResult.failedCommand || commitResult.error) {
        repositoryStateDescriptor.issue = `${commitResult.failedCommand} ${commitResult.error}`;
      } else {
        repositoryStateDescriptor.head = commitResult.headCommitHash;
      }

      result.push(repositoryStateDescriptor);
    }
  }

  return finishThisAction(lockFilePath);
}

function transformRepositoryStateDescriptorsArrayToHash(descriptors: RepositoryStateDescriptor[]): any {
  return descriptors.reduce((result: any, descriptor: RepositoryStateDescriptor) => {
    const commitBasedKey = `${descriptor.name}@${descriptor.branch}:${descriptor.commit || 'HEAD'}`;

    if (descriptor.issue) {
      const data = {
        path: descriptor.path,
        url: descriptor.url,
        head: descriptor.head,
        name: descriptor.name,
        issue: descriptor.issue
      };

      result[commitBasedKey] = data;
    } else {
      const headBasedKey = `${descriptor.name}@${descriptor.branch}:${descriptor.head}`;
      const data = {
        path: descriptor.path,
        url: descriptor.url,
        head: descriptor.head,
        name: descriptor.name
      };

      result[commitBasedKey] = data;
      result[headBasedKey] = data;
    }

    return result;
  }, {});
}

export async function mongolessImport(): Promise<void> {
  if (config.IS_TESTING || config.IS_LOCAL) {
    return Promise.resolve();
  }

  normalizeRepositoryDescriptorsSource();

  const repositoryStateDescriptors = [];

  for (const repository of repositories) {
    repositoryStateDescriptors.push(...await getRepositoryStateDescriptors(repository));
  }

  const reposDescriptorsFile = path.resolve(constants.WORKDIR, 'ws.import', 'repos', 'repositories-descriptors.json');
  const reposDescriptorsFileContent =
    JSON.stringify(transformRepositoryStateDescriptorsArrayToHash(repositoryStateDescriptors), null, 2);

  return new Promise<void>((resolve: Function) => {
    fs.writeFile(reposDescriptorsFile, reposDescriptorsFileContent, (err: Error) => {
      logger.error(err);
      resolve(err);
    });
  });
}

/*
(async function () {
  const mongolessImportResult = await mongolessImport();

  console.log(`that's all: ${mongolessImportResult}`);
})();
*/

