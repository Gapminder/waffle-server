import * as chai from 'chai';
import * as fs from 'fs';
import 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import { reposService } from 'waffle-server-repo-service';
import { config } from '../../ws.config/config';
import { logger } from '../../ws.config/log';
import * as wsReposService from '../../ws.services/repos.service';

const expect = chai.expect;
const sandbox = sinon.createSandbox();
const assert = sinon.assert;

describe('repos service 2', () => {

  afterEach(() => sandbox.restore());

  it('should clone repo successfully when destination dir was not created and commit was given', (done: Function) => {
    const fetchStub = sandbox.stub(reposService, 'fetch').callsArgWithAsync(1, null);
    const resetStub = sandbox.stub(reposService, 'reset').callsArgWithAsync(1, null);
    const checkoutToBranchStub = sandbox.stub(reposService, 'checkoutToBranch').callsArgWithAsync(1, null);
    const checkoutToCommitStub = sandbox.stub(reposService, 'checkoutToCommit').callsArgWithAsync(1, null);
    const pullStub = sandbox.stub(reposService, 'pull').callsArgWithAsync(1, null);
    const cleanStub = sandbox.stub(reposService, 'clean').callsArgWithAsync(1, null);
    const cloneStub = sandbox.stub(reposService, 'clone').callsArgWithAsync(1, null);
    const silentCloneStub = sandbox.stub(reposService, 'silentClone').callsArgWithAsync(1, null);
    const makeDirForceStub = sandbox.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = sandbox.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = sandbox.stub(fs, 'exists').callsArgWithAsync(1, false);

    const infoStub = sandbox.stub(logger, 'info');
    const errorStub = sandbox.stub(logger, 'error');
    const debugStub = sandbox.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.calledOnce(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);
      assert.calledOnce(silentCloneStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('should clone repo successfully when destination dir was created but is empty and commit was given', (done: Function) => {
    const fetchStub = sandbox.stub(reposService, 'fetch').callsArgWithAsync(1, null);
    const resetStub = sandbox.stub(reposService, 'reset').callsArgWithAsync(1, null);
    const checkoutToBranchStub = sandbox.stub(reposService, 'checkoutToBranch').callsArgWithAsync(1, null);
    const checkoutToCommitStub = sandbox.stub(reposService, 'checkoutToCommit').callsArgWithAsync(1, null);
    const pullStub = sandbox.stub(reposService, 'pull').callsArgWithAsync(1, null);
    const cleanStub = sandbox.stub(reposService, 'clean').callsArgWithAsync(1, null);
    const cloneStub = sandbox.stub(reposService, 'clone').callsArgWithAsync(1, null);
    const silentCloneStub = sandbox.stub(reposService, 'silentClone').callsArgWithAsync(1, null);
    const makeDirForceStub = sandbox.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = sandbox.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = sandbox.stub(fs, 'exists')
      .onFirstCall().callsArgWithAsync(1, true)
      .onSecondCall().callsArgWithAsync(1, false);

    const infoStub = sandbox.stub(logger, 'info');
    const errorStub = sandbox.stub(logger, 'error');
    const debugStub = sandbox.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';
    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);
      assert.calledOnce(silentCloneStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('should clone repo successfully when destination dir was created but isn\'t empty and commit was given', (done: Function) => {
    const fetchStub = sandbox.stub(reposService, 'fetch').callsArgWithAsync(1, null);
    const resetStub = sandbox.stub(reposService, 'reset').callsArgWithAsync(1, null);
    const checkoutToBranchStub = sandbox.stub(reposService, 'checkoutToBranch').callsArgWithAsync(1, null);
    const checkoutToCommitStub = sandbox.stub(reposService, 'checkoutToCommit').callsArgWithAsync(1, null);
    const pullStub = sandbox.stub(reposService, 'pull').callsArgWithAsync(1, null);
    const cleanStub = sandbox.stub(reposService, 'clean').callsArgWithAsync(1, null);
    const cloneStub = sandbox.stub(reposService, 'clone').callsArgWithAsync(1, null);
    const silentCloneStub = sandbox.stub(reposService, 'silentClone').callsArgWithAsync(1, null);
    const makeDirForceStub = sandbox.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = sandbox.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = sandbox.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = sandbox.stub(logger, 'info');
    const errorStub = sandbox.stub(logger, 'error');
    const debugStub = sandbox.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';
    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);
      assert.notCalled(silentCloneStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('should clone repo successfully when destination dir was not created and commit wasn\'t given', (done: Function) => {
    const fetchStub = sandbox.stub(reposService, 'fetch').callsArgWithAsync(1, null);
    const resetStub = sandbox.stub(reposService, 'reset').callsArgWithAsync(1, null);
    const checkoutToBranchStub = sandbox.stub(reposService, 'checkoutToBranch').callsArgWithAsync(1, null);
    const checkoutToCommitStub = sandbox.stub(reposService, 'checkoutToCommit').callsArgWithAsync(1, null);
    const pullStub = sandbox.stub(reposService, 'pull').callsArgWithAsync(1, null);
    const cleanStub = sandbox.stub(reposService, 'clean').callsArgWithAsync(1, null);
    const cloneStub = sandbox.stub(reposService, 'clone').callsArgWithAsync(1, null);
    const silentCloneStub = sandbox.stub(reposService, 'silentClone').callsArgWithAsync(1, null);
    const makeDirForceStub = sandbox.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = sandbox.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = sandbox.stub(fs, 'exists').callsArgWithAsync(1, false);

    const infoStub = sandbox.stub(logger, 'info');
    const errorStub = sandbox.stub(logger, 'error');
    const debugStub = sandbox.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = null;
    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.calledOnce(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);
      assert.calledOnce(silentCloneStub);


      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('should clone repo successfully when destination dir was created but is empty and commit wasn\'t given', (done: Function) => {
    const fetchStub = sandbox.stub(reposService, 'fetch').callsArgWithAsync(1, null);
    const resetStub = sandbox.stub(reposService, 'reset').callsArgWithAsync(1, null);
    const checkoutToBranchStub = sandbox.stub(reposService, 'checkoutToBranch').callsArgWithAsync(1, null);
    const checkoutToCommitStub = sandbox.stub(reposService, 'checkoutToCommit').callsArgWithAsync(1, null);
    const pullStub = sandbox.stub(reposService, 'pull').callsArgWithAsync(1, null);
    const cleanStub = sandbox.stub(reposService, 'clean').callsArgWithAsync(1, null);
    const cloneStub = sandbox.stub(reposService, 'clone').callsArgWithAsync(1, null);
    const silentCloneStub = sandbox.stub(reposService, 'silentClone').callsArgWithAsync(1, null);
    const makeDirForceStub = sandbox.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = sandbox.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = sandbox.stub(fs, 'exists')
      .onFirstCall().callsArgWithAsync(1, true)
      .onSecondCall().callsArgWithAsync(1, false);

    const infoStub = sandbox.stub(logger, 'info');
    const errorStub = sandbox.stub(logger, 'error');
    const debugStub = sandbox.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = null;
    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(makeDirForceStub);
      assert.calledOnce(removeDirForceStub);
      assert.calledOnce(silentCloneStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('should clone repo successfully when destination dir was created but isn\'t empty and commit wasn\'t given', (done: Function) => {
    const fetchStub = sandbox.stub(reposService, 'fetch').callsArgWithAsync(1, null);
    const resetStub = sandbox.stub(reposService, 'reset').callsArgWithAsync(1, null);
    const checkoutToBranchStub = sandbox.stub(reposService, 'checkoutToBranch').callsArgWithAsync(1, null);
    const checkoutToCommitStub = sandbox.stub(reposService, 'checkoutToCommit').callsArgWithAsync(1, null);
    const pullStub = sandbox.stub(reposService, 'pull').callsArgWithAsync(1, null);
    const cleanStub = sandbox.stub(reposService, 'clean').callsArgWithAsync(1, null);
    const cloneStub = sandbox.stub(reposService, 'clone').callsArgWithAsync(1, null);
    const silentCloneStub = sandbox.stub(reposService, 'silentClone').callsArgWithAsync(1, null);
    const makeDirForceStub = sandbox.stub(reposService, 'makeDirForce').callsArgWithAsync(1, null);
    const removeDirForceStub = sandbox.stub(reposService, 'removeDirForce').callsArgWithAsync(1, null);

    const existsStub = sandbox.stub(fs, 'exists').callsArgWithAsync(1, true);

    const infoStub = sandbox.stub(logger, 'info');
    const errorStub = sandbox.stub(logger, 'error');
    const debugStub = sandbox.stub(logger, 'debug');

    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = null;
    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return wsReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(makeDirForceStub);
      assert.notCalled(removeDirForceStub);
      assert.notCalled(silentCloneStub);

      assert.calledOnce(fetchStub);
      assert.calledOnce(resetStub);
      assert.calledOnce(checkoutToBranchStub);
      assert.calledOnce(checkoutToCommitStub);
      assert.calledOnce(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });
});
