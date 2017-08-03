import { expect } from 'chai';
import * as fs from 'fs';
import * as _ from 'lodash';
import 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { reposService } from 'waffle-server-repo-service';
import { config } from '../../ws.config/config';

import { logger } from '../../ws.config/log';
import * as wsReposService from '../../ws.services/repos.service';

const assert = sinon.assert;
const match = sinon.match;

const sandbox = sinonTest.configureTest(sinon);

describe('repos service', () => {
  it('should hard checkout repo if it was cloned before', sandbox(function (done: Function): void {
    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);

    const exists = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const commit = 'bla1234';
    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, commit, (error: string, cloneResult: any) => {
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);
      assert.notCalled(silentCloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  }));

  it('should respond with an error if cannot detect repo name for cloning', sandbox(function (done: Function): void {
    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const exists = this.stub(fs, 'exists').callsArgWithAsync(1, false);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo('fake repo', 'any commit', (error) => {
      expect(error).to.equal('Incorrect github url was given (repo url: fake repo)');

      assert.calledTwice(exists);
      assert.calledOnce(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);

      assert.notCalled(fetchStub);
      assert.notCalled(resetStub);
      assert.notCalled(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.notCalled(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(cloneStub);
      assert.notCalled(silentCloneStub);

      assert.notCalled(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should respond with an error if it was impossible to create a path for repo to clone ', sandbox(function (done: Function): void {
    const expectedError = 'mkdirp was not able to create a folder <---- test error';
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:open-numbers/${ddfRepoName}.git`;
    const accountName = 'open-numbers';
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, expectedError);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const exists = this.stub(fs, 'exists').callsArgWithAsync(1, false);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(expectedGithubUrl, 'any commit', (error: string) => {
      expect(error).to.equal(`${expectedError} (repo url: ${expectedGithubUrl})`);

      assert.calledOnce(exists);
      assert.calledOnce(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.notCalled(fetchStub);
      assert.notCalled(resetStub);
      assert.notCalled(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.notCalled(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(cloneStub);
      assert.notCalled(silentCloneStub);

      assert.notCalled(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, expectedError);

      return done();
    });
  }));

  it('should respond with an error if something wrong occurred during "git clone" invocation', sandbox(function (done: Function): void {
    const expectedError = 'some error';
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:open-numbers/${ddfRepoName}.git`;
    const accountName = 'open-numbers';
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, expectedError);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const exists = this.stub(fs, 'exists').callsArgWithAsync(1, false);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(expectedGithubUrl, null, (error) => {
      expect(error).to.equal(`${expectedError} (repo url: ${expectedGithubUrl})`);

      assert.calledTwice(exists);
      assert.calledOnce(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);

      assert.notCalled(fetchStub);
      assert.notCalled(resetStub);
      assert.notCalled(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.notCalled(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(cloneStub);
      assert.calledOnce(silentCloneStub);

      assert.calledOnce(infoStub);
      assert.calledWithExactly(infoStub, match.string);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match('some error'));

      return done();
    });
  }));

  it('should clone repo successfully (when no commit given to checkout - HEAD is used instead)', sandbox(function (done: Function): void {
    const accountName = 'open-numbers';
    const expectedDdfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:${accountName}/${expectedDdfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, expectedDdfRepoName, 'master');

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const exists = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(expectedGithubUrl, null, (error: string, cloneResult: any) => {
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(exists);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);
      assert.notCalled(silentCloneStub);

      assert.callCount(infoStub, 3);
      assert.calledWithExactly(infoStub, `** Start cloning dataset: ${expectedGithubUrl}`);
      assert.calledWithExactly(infoStub, `** Start checkout dataset commit: ${expectedGithubUrl}`);
      assert.calledWithExactly(infoStub, `** Dataset commit has been got: ${expectedGithubUrl}`);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  }));

  it('should fail cloning if github url to ddf repo was not given', sandbox(function (done: Function): void {
    const noGithubUrl = null;

    wsReposService.cloneRepo(noGithubUrl, 'any commit', (error: string) => {
      expect(error).to.equal('Github url was not given');
      return done();
    });
  }));

  it('should fail removing files in destination dir, when it\'s not git repo', sandbox(function (done: Function): void {
    const accountName = 'open-numbers';
    const expectedDdfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:${accountName}/${expectedDdfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, expectedDdfRepoName, 'master');

    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, expectedError);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, null, false);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(expectedGithubUrl, null, (error: string) => {
      expect(error).to.equal(`${expectedError} (repo url: ${expectedGithubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.calledOnce(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);

      assert.notCalled(fetchStub);
      assert.notCalled(resetStub);
      assert.notCalled(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.notCalled(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(cloneStub);
      assert.calledOnce(silentCloneStub);

      assert.calledOnce(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should properly extract repo name from github url', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = wsReposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should properly extract repo name from github url with branch included', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis#development';

    const actualRepoName = wsReposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#development`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should build repo name without branch name included if this branch is master', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = wsReposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#master`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should build repo name without branch name included if only "#" branch separator is given', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = wsReposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#master`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should return null when no account can be inferred from given url', () => {
    const actualRepoName = wsReposService.getRepoNameForDataset(`git@github.com:/ddf--gapminder--systema_globalis.git`);
    expect(actualRepoName).to.be.null;
  });

  it('should return null when no repo name can be inferred from given url', () => {
    const actualRepoName = wsReposService.getRepoNameForDataset(`git@github.com:open-numbers/`);
    expect(actualRepoName).to.be.null;
  });

  it('should throw away part .git from repo name', () => {
    const expectedDdfRepoName = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const actualRepoName = wsReposService.getRepoNameForDataset(expectedDdfRepoName);

    expect(_.endsWith(actualRepoName, '.git')).to.equal(false);
  });

  it('should properly extract path to repo stored locally', () => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const accountName = 'open-numbers';

    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');
    const actualPathToRepo = wsReposService.getPathToRepo(`git@github.com:${accountName}/${ddfRepoName}`);

    expect(actualPathToRepo).to.equal(expectedPathToRepo);
  });

  it('should return falsy value as is when it was passed as a github url', sandbox(() => {
    const falsyInputs = [
      '',
      null,
      undefined
    ];

    falsyInputs.forEach((falsyInput: any) => {
      expect(wsReposService.getPathToRepo(falsyInput)).to.equal(falsyInput);
    });
  }));

  it('should handle pulling error during checkout when commit wasn\'t given', sandbox(function (done: Function): void {
    const ddfRepoName = 'sg';
    const githubUrl = `/ddf--gapminder--systema_globalis/master/.git`;
    const accountName = 'open-numbers';
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, expectedError);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(githubUrl, undefined, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(silentCloneStub);
      assert.notCalled(cloneStub);

      assert.calledTwice(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should handle reset error during checkout when commit wasn\'t given', sandbox(function (done: Function): void {
    const githubUrl = `git@github.com:open-numbers/sg.git`;
    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, expectedError);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(githubUrl, undefined, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.notCalled(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.notCalled(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(silentCloneStub);
      assert.notCalled(cloneStub);

      assert.calledTwice(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should handle cleaning error during checkout when commit wasn\'t given', sandbox(function (done: Function): void {
    const githubUrl = `git@github.com:open-numbers/sg.git`;
    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, expectedError);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(githubUrl, undefined, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(silentCloneStub);
      assert.notCalled(cloneStub);

      assert.calledTwice(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should handle error during checkout when commit wasn\'t given', sandbox(function (done: Function): void {
    const githubUrl = `git@github.com:open-numbers/sg.git`;
    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, null);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, expectedError);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(githubUrl, undefined, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(silentCloneStub);
      assert.notCalled(cloneStub);

      assert.calledTwice(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should handle pulling error on second call for some branch name during checkout when commit wasn\'t given', sandbox(function (done: Function): void {
    const branch = 'branch';
    const githubUrl = `git@github.com:open-numbers/sg.git#${branch}`;
    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, expectedError);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(githubUrl, undefined, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch ${branch} and commit HEAD (repo url: ${githubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(silentCloneStub);
      assert.notCalled(cloneStub);

      assert.calledTwice(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should handle pulling error on second call for some branch name during checkout to given commit', sandbox(function (done: Function): void {
    const branch = 'branch';
    const commit = 'aaaaaaa';
    const githubUrl = `git@github.com:open-numbers/sg.git#${branch}`;
    const expectedError = 'Boo!';

    const fetchStub = this.stub(reposService, 'fetch').callsArgOnWithAsync(1, reposService, null);
    const resetStub = this.stub(reposService, 'reset').callsArgOnWithAsync(1, reposService, null);
    const checkoutToBranchStub = this.stub(reposService, 'checkoutToBranch').callsArgOnWithAsync(1, reposService, null);
    const pullStub = this.stub(reposService, 'pull').callsArgOnWithAsync(1, reposService, expectedError);
    const cleanStub = this.stub(reposService, 'clean').callsArgOnWithAsync(1, reposService, null);
    const checkoutToCommitStub = this.stub(reposService, 'checkoutToCommit').callsArgOnWithAsync(1, reposService, null);
    const silentCloneStub = this.stub(reposService, 'silentClone').callsArgOnWithAsync(1, reposService, null);
    const cloneStub = this.stub(reposService, 'clone').callsArgOnWithAsync(1, reposService, null);
    const makeDirForceStub = this.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = this.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    return wsReposService.cloneRepo(githubUrl, commit, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch ${branch} and commit ${commit} (repo url: ${githubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.notCalled(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.notCalled(cleanStub);
      assert.notCalled(silentCloneStub);
      assert.notCalled(cloneStub);

      assert.calledTwice(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

});
