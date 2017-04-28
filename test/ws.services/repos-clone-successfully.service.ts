import 'mocha';

import * as path from 'path';
import * as sinon from 'sinon';
import * as chai from 'chai';

const expect = chai.expect;

import * as fs from 'fs';
import * as proxyquire from 'proxyquire';
import * as shell from 'shelljs';

import { logger } from '../../ws.config/log';
import { config } from '../../ws.config/config';

const reposServicePath = '../../ws.services/repos.service';
const assert = sinon.assert;

describe('should clone repo successfully', () => {
  const resetStub = sinon.stub();
  const checkoutStub = sinon.stub();
  const pullStub = sinon.stub();
  const cleanStub = sinon.stub();
  const cloneStub = sinon.stub();
  const gitStub = sinon.stub();
  const mkdirpStub = sinon.stub();
  let existsStub;
  let execStub;
  let infoStub;
  let errorStub;
  let debugStub;

  beforeEach(() => {
    existsStub = sinon.stub(fs, 'exists');
    execStub = sinon.stub(shell, 'exec');
    infoStub = sinon.stub(logger, 'info');
    errorStub = sinon.stub(logger, 'error');
    debugStub = sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    resetStub.reset();
    checkoutStub.reset();
    pullStub.reset();
    cleanStub.reset();
    cloneStub.reset();
    gitStub.reset();
    mkdirpStub.reset();

    existsStub.restore();
    execStub.restore();
    infoStub.restore();
    errorStub.restore();
    debugStub.restore();
  });

  it('when destination dir was not created and commit was given', (done: Function): void => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';

    resetStub.callsArgWithAsync(1, null);
    checkoutStub.callsArgWithAsync(1, null);
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    cleanStub.callsArgWithAsync(1, null);
    cloneStub.callsArgWithAsync(3, null);

    gitStub.returns({
      reset: resetStub,
      checkout: checkoutStub,
      pull: pullStub,
      clean: cleanStub,
      clone: cloneStub
    });

    mkdirpStub.callsArgWithAsync(1, null);
    existsStub
      .onFirstCall().callsArgWithAsync(1, false)
      .onSecondCall().callsArgWithAsync(1, false);
    execStub.callsArgWithAsync(1, 0);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': gitStub,
      mkdirp: mkdirpStub
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.calledOnce(mkdirpStub);
      assert.calledOnce(execStub);

      assert.calledTwice(gitStub);
      assert.calledOnce(resetStub);
      assert.calledThrice(checkoutStub);
      assert.calledTwice(pullStub);
      assert.calledOnce(cleanStub);
      assert.calledOnce(cloneStub);

      assert.callCount(infoStub, 4);
      assert.calledThrice(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('when destination dir was created but is empty and commit was given', (done: Function): void => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';

    resetStub.callsArgWithAsync(1, null);
    checkoutStub.callsArgWithAsync(1, null);
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    cleanStub.callsArgWithAsync(1, null);
    cloneStub.callsArgWithAsync(3, null);

    gitStub.returns({
      reset: resetStub,
      checkout: checkoutStub,
      pull: pullStub,
      clean: cleanStub,
      clone: cloneStub
    });

    mkdirpStub.callsArgWithAsync(1, null);
    existsStub
      .onFirstCall().callsArgWithAsync(1, true)
      .onSecondCall().callsArgWithAsync(1, false);
    execStub.callsArgWithAsync(1, 0);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': gitStub,
      mkdirp: mkdirpStub
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(mkdirpStub);
      assert.calledOnce(execStub);

      assert.calledTwice(gitStub);
      assert.calledOnce(resetStub);
      assert.calledThrice(checkoutStub);
      assert.calledTwice(pullStub);
      assert.calledOnce(cleanStub);
      assert.calledOnce(cloneStub);

      assert.callCount(infoStub, 4);
      assert.calledThrice(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('when destination dir was created but isn\'t empty and commit was given', (done: Function): void => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';

    resetStub.callsArgWithAsync(1, null);
    checkoutStub.callsArgWithAsync(1, null);
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    cleanStub.callsArgWithAsync(1, null);
    cloneStub.callsArgWithAsync(3, null);

    gitStub.returns({
      reset: resetStub,
      checkout: checkoutStub,
      pull: pullStub,
      clean: cleanStub,
      clone: cloneStub
    });

    mkdirpStub.callsArgWithAsync(1, null);
    existsStub
      .onFirstCall().callsArgWithAsync(1, true)
      .onSecondCall().callsArgWithAsync(1, true);
    execStub.callsArgWithAsync(1, 0);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': gitStub,
      mkdirp: mkdirpStub
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(mkdirpStub);
      assert.notCalled(execStub);

      assert.calledOnce(gitStub);
      assert.calledOnce(resetStub);
      assert.calledThrice(checkoutStub);
      assert.calledTwice(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('when destination dir was not created and commit wasn\'t given', (done: Function): void => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = null;

    resetStub.callsArgWithAsync(1, null);
    checkoutStub.callsArgWithAsync(1, null);
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    cleanStub.callsArgWithAsync(1, null);
    cloneStub.callsArgWithAsync(3, null);

    gitStub.returns({
      reset: resetStub,
      checkout: checkoutStub,
      pull: pullStub,
      clean: cleanStub,
      clone: cloneStub
    });

    mkdirpStub.callsArgWithAsync(1, null);
    existsStub
      .onFirstCall().callsArgWithAsync(1, false)
      .onSecondCall().callsArgWithAsync(1, false);
    execStub.callsArgWithAsync(1, 0);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': gitStub,
      mkdirp: mkdirpStub
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.calledOnce(mkdirpStub);
      assert.calledOnce(execStub);

      assert.calledTwice(gitStub);
      assert.calledOnce(resetStub);
      assert.calledThrice(checkoutStub);
      assert.calledTwice(pullStub);
      assert.calledOnce(cleanStub);
      assert.calledOnce(cloneStub);

      assert.callCount(infoStub, 4);
      assert.calledThrice(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('when destination dir was created but is empty and commit wasn\'t given', (done: Function): void => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = null;

    resetStub.callsArgWithAsync(1, null);
    checkoutStub.callsArgWithAsync(1, null);
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    cleanStub.callsArgWithAsync(1, null);
    cloneStub.callsArgWithAsync(3, null);

    gitStub.returns({
      reset: resetStub,
      checkout: checkoutStub,
      pull: pullStub,
      clean: cleanStub,
      clone: cloneStub
    });

    mkdirpStub.callsArgWithAsync(1, null);
    existsStub
      .onFirstCall().callsArgWithAsync(1, true)
      .onSecondCall().callsArgWithAsync(1, false);
    execStub.callsArgWithAsync(1, 0);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': gitStub,
      mkdirp: mkdirpStub
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(mkdirpStub);
      assert.calledOnce(execStub);

      assert.calledTwice(gitStub);
      assert.calledOnce(resetStub);
      assert.calledThrice(checkoutStub);
      assert.calledTwice(pullStub);
      assert.calledOnce(cleanStub);
      assert.calledOnce(cloneStub);

      assert.callCount(infoStub, 4);
      assert.calledThrice(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });

  it('when destination dir was created but isn\'t empty and commit wasn\'t given', (done: Function): void => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = null;

    resetStub.callsArgWithAsync(1, null);
    checkoutStub.callsArgWithAsync(1, null);
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    cleanStub.callsArgWithAsync(1, null);
    cloneStub.callsArgWithAsync(3, null);

    gitStub.returns({
      reset: resetStub,
      checkout: checkoutStub,
      pull: pullStub,
      clean: cleanStub,
      clone: cloneStub
    });

    mkdirpStub.callsArgWithAsync(1, null);
    existsStub
      .onFirstCall().callsArgWithAsync(1, true)
      .onSecondCall().callsArgWithAsync(1, true);
    execStub.callsArgWithAsync(1, 0);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': gitStub,
      mkdirp: mkdirpStub
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error: string, cloneResult: any) => {
      expect(error).to.not.exist;
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledTwice(existsStub);

      assert.notCalled(mkdirpStub);
      assert.notCalled(execStub);

      assert.calledOnce(gitStub);
      assert.calledOnce(resetStub);
      assert.calledThrice(checkoutStub);
      assert.calledTwice(pullStub);
      assert.calledOnce(cleanStub);
      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      return done();
    });
  });
});
