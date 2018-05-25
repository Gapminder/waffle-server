import * as path from 'path';
import * as shell from 'shelljs';
import * as fsExtra from 'fs-extra';

export type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type CheckoutResult = {
  failedCommand?: string;
  error?: string;
  headCommitHash?: string;
};

export class GitUtils {
  public constructor(private reposRoot: string, private repositoryGitUrl: string, private repositoryName: string) {
  }

  public static getRepositoryNameByUrl(repoUrl: string): string {
    try {
      return repoUrl.split(':')[1].replace(/\.git$/, '');
    } catch (error) {
      return null;
    }
  }

  public static getRepoPath(reposRoot: string, repoName: string, branch: string, commit: string): string {
    return commit !== 'HEAD' ?
      path.resolve(reposRoot, repoName, `${branch}-${commit}`) :
      path.resolve(reposRoot, repoName, `${branch}`);
  }

  public async initRepository(): Promise<CommandResult> {
    const masterRepoPath = path.resolve(this.reposRoot, this.repositoryName, 'master');
    const command = `git clone -v ${this.repositoryGitUrl} ${masterRepoPath}`;

    return new Promise<CommandResult>((resolve: Function) => {
      fsExtra.pathExists(masterRepoPath, (err: Error, exists: boolean) => {
        if (err) {
          return resolve({code: 1, stdout: '', stderr: err});
        }

        if (exists) {
          return resolve({code: 0, stdout: '', stderr: ''});
        }

        shell.exec(command, {async: true}, (code: number, stdout: string, stderr: string) =>
          resolve({code, stdout, stderr}));
      });
    });
  }

  public async checkoutToGivenCommit(branch: string, commit: string): Promise<CheckoutResult> {
    const repoPath = this.getStatefulRepoPath(branch, commit);
    const execCommand = (command: string): Promise<CommandResult> =>
      new Promise<CommandResult>((resolve: Function) => {
        const gitCommand = `git --git-dir=${repoPath}/.git --work-tree=${repoPath} ${command}`;

        shell.exec(gitCommand, {async: true}, (code: number, stdout: string, stderr: string) =>
          resolve({code, stdout, stderr}));
      });

    const getHeadCommitHash = async (): Promise<CheckoutResult> => {
      const command = `rev-parse --verify HEAD`;
      const result = await execCommand(command);
      const SHORT_COMMIT_LENGTH = 7;

      if (result.code !== 0 || result.stdout.length < SHORT_COMMIT_LENGTH) {
        return {failedCommand: command, error: result.stderr};
      }

      return {headCommitHash: result.stdout.substr(0, SHORT_COMMIT_LENGTH)};
    };

    const commands = [
      `fetch --all --prune`,
      `reset --hard origin/${branch}`,
      `checkout ${branch}`,
      `pull origin ${branch}`,
      `clean -f -x`,
      `checkout ${commit}`
    ];

    for (const command of commands) {
      const result = await execCommand(command);

      if (result.code !== 0) {
        return new Promise<CheckoutResult>((resolve: Function) =>
          resolve({failedCommand: command, error: result.stderr}));
      }
    }

    const headCommitHashResult = await getHeadCommitHash();

    return new Promise<CheckoutResult>((resolve: Function) => {
      if (headCommitHashResult.failedCommand || headCommitHashResult.error) {
        return resolve({failedCommand: headCommitHashResult.failedCommand, error: headCommitHashResult.error});
      }

      resolve({headCommitHash: headCommitHashResult.headCommitHash});
    });
  }

  private getStatefulRepoPath(branch: string, commit: string): string {
    return GitUtils.getRepoPath(this.reposRoot, this.repositoryName, branch, commit);
  }
}
