import * as path from 'path';
import * as shell from 'shelljs';
import * as fsExtra from 'fs-extra';
import * as fs from 'fs';
import { keys, includes } from 'lodash';
import { repositoryDescriptors as repositoryDescriptorsSource } from './ws.config/mongoless-repos.config';

interface RepositoryStateDescriptor {
  url: string;
  name?: string;
  branch?: string;
  head?: string;
  commit?: string;
  path?: string;
  time?: string;
  issue?: string;
}

interface CheckoutResult {
  failedCommand?: string;
  error?: string;
  headCommitHash?: string;
}

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

function checkoutToGivenCommit(repositoryStateDescriptor: RepositoryStateDescriptor): CheckoutResult {
  const execCommand = (command: string) => shell.exec(`git --git-dir=${repositoryStateDescriptor.path}/.git --work-tree=${repositoryStateDescriptor.path} ${command}`);
  const getHeadCommitHash = (): CheckoutResult => {
    const command = `rev-parse --verify HEAD`;
    const result = execCommand(command);
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
    const result = execCommand(command);

    if (result.code !== 0) {
      return { failedCommand: command, error: result.stderr };
    }
  }

  const headCommitHashResult = getHeadCommitHash();

  if (headCommitHashResult.failedCommand || headCommitHashResult.error) {
    return { failedCommand: headCommitHashResult.failedCommand, error: headCommitHashResult.error };
  }

  return { headCommitHash: headCommitHashResult.headCommitHash };
}

function initRepository(repositoryGitUrl: string, repositoryName: string): string | null {
  const masterRepoPath = path.resolve(reposPath, repositoryName, 'master');

  if (!fsExtra.pathExistsSync(masterRepoPath)) {
    const command = `git clone ${repositoryGitUrl} ${masterRepoPath}`;
    const result = shell.exec(command);

    return result.code === 0 ? null : `error: ${result.stderr} : ${command}`;
  }

  return null;
}

function makeBranchesDrafts(repositoryGitUrl: string, repositoryName: string): { [key: string]: string } {
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

      if (!fsExtra.pathExistsSync(thisRepoPath)) {
        try {
          fsExtra.copySync(masterRepoPath, thisRepoPath);
        } catch (error) {
          issues[thisRepoPath] = error;
        }
      }
    }
  }

  return issues;
}

function getRepositoryStateDescriptors(): RepositoryStateDescriptor[] {
  const result: RepositoryStateDescriptor[] = [];

  for (const repository of repositories) {
    const repoName = getRepositoryNameByUrl(repository);

    if (!repoName) {
      result.push({ url: repository });
      continue;
    }

    const initRepositoryIssue = initRepository(repository, repoName);

    if (initRepositoryIssue) {
      result.push({ url: repository, name: repoName, branch: 'master' });

      continue;
    }

    const makeBranchesIssuesHash = makeBranchesDrafts(repository, repoName);
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

        if (makeBranchesIssuesHash[thisRepoPath]) {
          repositoryStateDescriptor.issue = makeBranchesIssuesHash[thisRepoPath];
          result.push(repositoryStateDescriptor);

          continue;
        }

        const commitResult: CheckoutResult = checkoutToGivenCommit(repositoryStateDescriptor);

        if (commitResult.failedCommand || commitResult.error) {
          repositoryStateDescriptor.issue = `${commitResult.failedCommand} ${commitResult.error}`;
        } else {
          repositoryStateDescriptor.head = commitResult.headCommitHash;
        }

        result.push(repositoryStateDescriptor);
      }
    }
  }

  return result;
}

function transformRepositoryStateDescriptorsArrayToHash(descriptors: RepositoryStateDescriptor[]): any {
  return descriptors.reduce((result: any, descriptor: RepositoryStateDescriptor) => {
    const commitBasedKey = `${descriptor.name}@${descriptor.branch}:${descriptor.commit}`;
    const headBasedKey = `${descriptor.name}@${descriptor.branch}:${descriptor.head}`;
    const data = { path: descriptor.path, url: descriptor.url, head: descriptor.head, name: descriptor.name };

    result[commitBasedKey] = data;
    result[headBasedKey] = data;

    return result;
  }, {});
}

normalizeRepositoryDescriptorsSource();
const repositoryStateDescriptors = getRepositoryStateDescriptors();
const reposDescriptorsFile = path.resolve('.', 'ws.import', 'repos', 'repositories-descriptors.json');

fs.writeFileSync(reposDescriptorsFile,
  JSON.stringify(transformRepositoryStateDescriptorsArrayToHash(repositoryStateDescriptors), null, 2));
