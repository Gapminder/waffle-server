import * as path from 'path';
import * as shell from 'shelljs';
import * as fsExtra from 'fs-extra';
import { logger } from '../../ws.config/log';
import { RepoDescriptor } from './repo-descriptor';
import { WsImportError } from './ws-import-error';

export class DataSetManager {
  public repoNickname: string;
  public branch: string;
  public hash: string;

  private readonly repoOriginPath: string;
  private readonly importRepoPath: string;

  public constructor(private repoDescriptor: RepoDescriptor, private reposRootPath: string, private importRootPath: string) {
    this.repoNickname = repoDescriptor.repoNickname;
    this.branch = repoDescriptor.branch || 'master';
    this.hash = repoDescriptor.hash || 'HEAD';
    this.repoOriginPath = path.resolve(this.reposRootPath, this.repoNickname);
    this.importRepoPath = path.resolve(this.importRootPath, this.repoNickname, `${this.branch}-${this.hash}`);
  }

  public async initRepository(): Promise<void> {
    const command = `git clone -v ${this.getRepositoryGitUrl()} ${this.repoOriginPath}`;
    const repoOriginPath = this.repoOriginPath;

    return new Promise<void>((resolve: Function, reject: Function) => {
      fsExtra.pathExists(repoOriginPath, (err: Error, exists: boolean) => {
        if (err) {
          return reject(new WsImportError(err.message, {repoOriginPath, command}, err));
        }

        if (exists) {
          return resolve();
        }

        logger.info(command);
        shell.exec(command, {async: true}, (code: number, stdout: string, stderr: string) => {
          if (code !== 0) {
            return reject(new WsImportError(stderr, {code, stdout, repoOriginPath, command}));
          }

          resolve();
        });
      });
    });
  }

  public async deleteExistingImportedDataSet(): Promise<void> {
    return new Promise<void>((resolve: Function, reject: Function) => {
      const importRepoPath = this.importRepoPath;

      fsExtra.pathExists(importRepoPath, (err: Error, exists: boolean) => {
        if (err) {
          return reject(new WsImportError(err.message, {importRepoPath}, err));
        }

        if (!exists) {
          return resolve();
        }

        fsExtra.remove(importRepoPath, (removeErr: Error) => {
          if (removeErr) {
            return reject(new WsImportError(removeErr.message, {importRepoPath}, removeErr));
          }

          resolve();
        });
      });
    });
  }

  public async copyDataSetFromSourceToImported(): Promise<void> {
    return new Promise<void>((resolve: Function, reject: Function) => {
      const repoOriginPath = this.repoOriginPath;
      const importRepoPath = this.importRepoPath;

      fsExtra.copy(repoOriginPath, importRepoPath, (copyErr: Error) => {
        if (copyErr) {
          return reject(new WsImportError(copyErr.message, {repoOriginPath, importRepoPath}, copyErr));
        }

        resolve();
      });
    });
  }

  public async checkoutToGivenCommit(): Promise<string> {
    const SHORT_COMMIT_LENGTH = 7;
    const importRepoPath = this.importRepoPath;
    const execCommand = (command: string): Promise<string> => new Promise<string>((resolve: Function, reject: Function) => {
      const gitCommand = `git --git-dir=${importRepoPath}/.git --work-tree=${importRepoPath} ${command}`;
      logger.info(gitCommand);

      shell.exec(gitCommand, {async: true}, (code: number, stdout: string, stderr: string) => {
        if (code !== 0) {
          return reject(new WsImportError(stderr, {code, stdout, command}));
        }

        resolve(stdout);
      });
    });

    return new Promise<string>(async (resolve: Function, reject: Function) => {
      const commands = [
        `fetch --all --prune`,
        `reset --hard origin/${this.branch}`,
        `checkout ${this.branch}`,
        `pull origin ${this.branch}`,
        `clean -f -x`,
        `checkout ${this.hash}`
      ];

      try {
        for (const command of commands) {
          await execCommand(command);
        }

        const commit = await execCommand(`rev-parse --verify HEAD`);
        const hash = commit.substr(0, SHORT_COMMIT_LENGTH);

        resolve(hash);
      } catch (e) {
        reject(new WsImportError(e.message, {commands}, e));
      }
    });
  }

  private getRepositoryGitUrl(): string {
    return `git@github.com:${this.repoNickname}.git`;
  }
}
