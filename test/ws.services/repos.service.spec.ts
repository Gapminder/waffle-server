import 'mocha';

import * as _ from 'lodash';
import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';

const assert = sinon.assert;
const match = sinon.match;

import * as fs from 'fs';
import * as proxyquire from 'proxyquire';
import * as git from 'simple-git';
import * as shell from 'shelljs';

import { logger } from '../../ws.config/log';
import { config } from '../../ws.config/config';
import * as reposService from '../../ws.services/repos.service';

const test = sinonTest.configureTest(sinon);
const reposServicePath = '../../ws.services/repos.service';

describe('repos service', () => {
  it('should hard checkout repo if it was cloned before', (done: Function) => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const ddfRepoCommitHash = 'bla1234';
    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, null);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, null);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, null);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const infoStub = sinon.stub(logger, 'info');
    const errorStub = sinon.stub(logger, 'error');
    const debugStub = sinon.stub(logger, 'debug');

    const stubbedReposService = proxyquire(reposServicePath, {
      '../ws.config/log': {
        info: infoStub,
        debug: debugStub,
        error: errorStub
      },
      'simple-git': function () {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      },
      'fs': {
        exists: (pathTeRepo, done) => {
          const wasClonedBefore = true;
          done(wasClonedBefore);
        }
      }
    });

    const accountName = 'open-numbers';
    const githubUrl = `git@github.com:${accountName}/${ddfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    return stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error, cloneResult) => {
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledOnce(resetStub);
      expect(resetStub.args[0][0]).to.be.deep.equal(['--hard', `origin/master`]);

      assert.calledThrice(checkoutStub);
      expect(checkoutStub.args[0][0]).to.be.deep.equal([`master`]);
      expect(checkoutStub.args[1][0]).to.be.deep.equal([`master`]);
      expect(checkoutStub.args[2][0]).to.be.deep.equal([ddfRepoCommitHash]);

      assert.calledTwice(pullStub);
      expect(pullStub.args[0][0]).to.not.instanceof(Array);
      expect(pullStub.args[1][0]).to.be.equal('origin');
      expect(pullStub.args[1][1]).to.be.equal('master');

      assert.calledOnce(cleanStub);
      expect(cleanStub.args[0][0]).to.be.equal('f');

      assert.notCalled(cloneStub);

      assert.calledThrice(infoStub);
      assert.notCalled(debugStub);
      assert.notCalled(errorStub);

      infoStub.restore();
      errorStub.restore();
      debugStub.restore();

      return done();
    });
  });

  it('should respond with an error if cannot detect repo name for cloning', (done: Function) => {
    const infoStub = sinon.stub(logger, 'info');
    const errorStub = sinon.stub(logger, 'error');
    const debugStub = sinon.stub(logger, 'debug');

    const stubbedReposService = proxyquire(reposServicePath, {
      '../ws.config/log': {
        info: infoStub,
        debug: debugStub,
        error: errorStub
      },
      'fs': {
        exists: (pathTeRepo, done) => {
          const wasClonedBefore = false;
          done(wasClonedBefore);
        }
      }
    });

    return stubbedReposService.cloneRepo('fake repo', 'any commit', error => {
      expect(error).to.equal('Incorrect github url was given (repo url: fake repo)');

      assert.notCalled(infoStub);
      assert.calledThrice(debugStub);
      assert.calledWithExactly(debugStub, match.string, match.string.or(match.number));
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      infoStub.restore();
      errorStub.restore();
      debugStub.restore();

      return done();
    });
  });

  it('should respond with an error if it was impossible to create a path for repo to clone ', (done: Function) => {
    const expectedError = 'mkdirp was not able to create a folder <---- test error';
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:open-numbers/${ddfRepoName}.git`;
    const accountName = 'open-numbers';
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    const infoStub = sinon.stub(logger, 'info');
    const errorStub = sinon.stub(logger, 'error');
    const debugStub = sinon.stub(logger, 'debug');

    const stubbedReposService = proxyquire(reposServicePath, {
      'fs': {
        exists: (pathTeRepo, done) => {
          const wasClonedBefore = false;
          done(wasClonedBefore);
        }
      },
      mkdirp: (pathTeRepo, done) => {
        expect(pathTeRepo).to.equal(expectedPathToRepo);
        done(expectedError);
      },
      '../ws.config/log': {
        info: infoStub,
        debug: debugStub,
        error: errorStub
      }
    });

    return stubbedReposService.cloneRepo(expectedGithubUrl, 'any commit', error => {
      expect(error).to.equal(`${expectedError} (repo url: ${expectedGithubUrl})`);

      assert.notCalled(infoStub);
      assert.notCalled(debugStub);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, expectedError);

      infoStub.restore();
      errorStub.restore();
      debugStub.restore();

      return done();
    });
  });

  it('should respond with an error if something wrong occurred during "git clone" invocation', (done: Function) => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:open-numbers/${ddfRepoName}.git`;
    const accountName = 'open-numbers';
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');

    const infoStub = sinon.stub(logger, 'info');
    const errorStub = sinon.stub(logger, 'error');
    const debugStub = sinon.stub(logger, 'debug');

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': function () {
        return {
          clone: function (actualGithubUrl, pathToRepo, options, done) {
            expect(actualGithubUrl).to.equal(expectedGithubUrl);
            expect(pathToRepo).to.equal(expectedPathToRepo);
            expect(options).to.deep.equal(['-b', 'master']);
            done('some error');
            return this;
          },
          silent: function () {
            return this;
          }
        };
      },
      'fs': {
        exists: (pathTeRepo, done) => {
          const wasClonedBefore = false;
          done(wasClonedBefore);
        }
      },
      '../ws.config/log': {
        info: infoStub,
        debug: debugStub,
        error: errorStub
      }
    });

    return stubbedReposService.cloneRepo(expectedGithubUrl, null, error => {
      expect(error).to.equal(`some error (repo url: ${expectedGithubUrl})`);

      assert.calledOnce(infoStub);
      assert.calledWithExactly(infoStub, match.string);
      assert.calledThrice(debugStub);
      assert.calledWithExactly(debugStub, match.string, match.string.or(match.number));
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match('some error'));

      infoStub.restore();
      errorStub.restore();
      debugStub.restore();

      return done();
    });
  });

  it('should clone repo successfully (when no commit given to checkout - HEAD is used instead)', test(function (done: Function) {
    const accountName = 'open-numbers';
    const expectedDdfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:${accountName}/${expectedDdfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, expectedDdfRepoName, 'master');

    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, null);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, null);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, null);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': function () {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      },
      'fs': {
        exists: (pathTeRepo, done) => {
          const wasClonedBefore = false;
          done(wasClonedBefore);
        }
      },
      '../ws.config/log': {
        info: infoStub,
        debug: debugStub,
        error: errorStub
      }
    });

    return stubbedReposService.cloneRepo(expectedGithubUrl, null, (error, cloneResult) => {
      expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);

      assert.calledOnce(cloneStub);
      expect(cloneStub.args[0][0]).to.be.equal(expectedGithubUrl);
      expect(cloneStub.args[0][1]).to.be.equal(expectedPathToRepo);
      expect(cloneStub.args[0][2]).to.be.deep.equal(['-b', 'master']);

      assert.calledOnce(resetStub);
      expect(resetStub.args[0][0]).to.be.deep.equal(['--hard', `origin/master`]);

      assert.calledThrice(checkoutStub);
      expect(checkoutStub.args[0][0]).to.be.deep.equal([`master`]);
      expect(checkoutStub.args[1][0]).to.be.deep.equal([`master`]);
      expect(checkoutStub.args[2][0]).to.be.deep.equal(['HEAD']);

      assert.calledTwice(pullStub);
      expect(pullStub.args[0][0]).to.not.instanceof(Array);
      expect(pullStub.args[1][0]).to.be.equal('origin');
      expect(pullStub.args[1][1]).to.be.equal('master');

      assert.calledOnce(cleanStub);
      expect(cleanStub.args[0][0]).to.be.equal('f');

      assert.callCount(infoStub, 4);
      assert.calledWithExactly(infoStub, `** Start cloning dataset: ${expectedGithubUrl}`);
      assert.calledWithExactly(infoStub, `** Dataset has been cloned: ${expectedGithubUrl}`);
      assert.calledThrice(debugStub);
      assert.calledWithExactly(debugStub, match.string, match.string.or(match.number));
      assert.notCalled(errorStub);

      return done();
    });
  }));

  it('should fail cloning if github url to ddf repo was not given', (done: Function) => {
    const noGithubUrl = null;

    reposService.cloneRepo(noGithubUrl, 'any commit', error => {
      expect(error).to.equal('Github url was not given');
      done();
    });
  });

  it('should fail removing files in destination dir, when it\'s not git repo', sinon.test(function (done: Function): void {
    const accountName = 'open-numbers';
    const expectedDdfRepoName = 'ddf--gapminder--systema_globalis';
    const expectedGithubUrl = `git@github.com:${accountName}/${expectedDdfRepoName}.git`;
    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, expectedDdfRepoName, 'master');

    const expectedCode = 1;
    const expectedStdout = 'Stdout';
    const expectedStderr = 'Stderr';

    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, null, false);
    const execStub = this.stub(shell, 'exec').callsArgWithAsync(1, expectedCode, expectedStdout, expectedStderr);

    const infoStub = this.stub(logger, 'info');
    const errorStub = this.stub(logger, 'error');
    const debugStub = this.stub(logger, 'debug');

    const stubbedReposService = proxyquire(reposServicePath, {
      'shell': {
        exec: execStub
      },
      'fs': {
        exists: existsStub
      },
      '../ws.config/log': {
        info: infoStub,
        debug: debugStub,
        error: errorStub
      }
    });

    return stubbedReposService.cloneRepo(expectedGithubUrl, null, (error: string) => {
      expect(error).to.equal(`Error: cleaning repo directory '${expectedPathToRepo}' was failed (repo url: ${expectedGithubUrl})`);

      assert.calledTwice(existsStub);
      assert.calledWith(existsStub, match.string);
      assert.calledOnce(execStub);
      assert.calledWithExactly(execStub, `rm -rf ${expectedPathToRepo}`, match.func);

      assert.notCalled(infoStub);
      assert.calledThrice(debugStub);
      assert.calledWithExactly(debugStub, 'Exit code:', expectedCode);
      assert.calledWithExactly(debugStub, 'Program output:', expectedStdout);
      assert.calledWithExactly(debugStub, 'Program stderr:', expectedStderr);
      assert.calledOnce(errorStub);
      assert.calledWithExactly(errorStub, match.string);

      return done();
    });
  }));

  it('should properly extract repo name from github url', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should properly extract repo name from github url with branch included', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis#development';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#development`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should build repo name without branch name included if this branch is master', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#master`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should build repo name without branch name included if only "#" branch separator is given', () => {
    const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#master`);

    expect(actualRepoName).to.equal(expectedDdfRepoName);
  });

  it('should return null when no account can be inferred from given url', () => {
    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:/ddf--gapminder--systema_globalis.git`);
    expect(actualRepoName).to.be.null;
  });

  it('should return null when no repo name can be inferred from given url', () => {
    const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/`);
    expect(actualRepoName).to.be.null;
  });

  it('should throw away part .git from repo name', () => {
    const expectedDdfRepoName = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const actualRepoName = reposService.getRepoNameForDataset(expectedDdfRepoName);

    expect(_.endsWith(actualRepoName, '.git')).to.equal(false);
  });

  it('should properly extract path to repo stored locally', () => {
    const ddfRepoName = 'ddf--gapminder--systema_globalis';
    const accountName = 'open-numbers';

    const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName, 'master');
    const actualPathToRepo = reposService.getPathToRepo(`git@github.com:${accountName}/${ddfRepoName}`);

    expect(actualPathToRepo).to.equal(expectedPathToRepo);
  });

  it('should return falsy value as is when it was passed as a github url', () => {
    const falsyInputs = [
      '',
      null,
      undefined
    ];

    falsyInputs.forEach(falsyInput => {
      expect(reposService.getPathToRepo(falsyInput)).to.equal(falsyInput);
    });
  });

  it('should handle pulling error during checkout to given commit', test(function (done: Function): void {
    const expectedError = 'Boo!';
    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, null);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, null);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, expectedError)
      .onSecondCall().callsArgWithAsync(2, null);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, null);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': () => {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      }
    });

    const githubUrl = `git@github.com:open-numbers/sg.git`;
    return stubbedReposService.cloneRepo(githubUrl, null, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      sinon.assert.calledTwice(existsStub);

      sinon.assert.notCalled(cloneStub);
      sinon.assert.notCalled(cleanStub);
      sinon.assert.calledOnce(pullStub);
      sinon.assert.calledOnce(resetStub);
      sinon.assert.calledOnce(checkoutStub);

      return done();
    });
  }));

  it('should handle reset error during checkout', test(function (done: Function): void {
    const expectedError = 'Boo!';
    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, expectedError);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, null);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, null);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': () => {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      }
    });

    const githubUrl = `git@github.com:open-numbers/sg.git`;
    return stubbedReposService.cloneRepo(githubUrl, null, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      sinon.assert.calledTwice(existsStub);

      sinon.assert.calledOnce(resetStub);
      sinon.assert.notCalled(cloneStub);
      sinon.assert.notCalled(cleanStub);
      sinon.assert.notCalled(pullStub);
      sinon.assert.notCalled(checkoutStub);

      return done();
    });
  }));

  it('should handle cleaning error during checkout', sinon.test(function (done: Function): void {
    const expectedError = 'Boo!';
    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, null);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, null);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, expectedError);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': () => {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      }
    });

    const githubUrl = `git@github.com:open-numbers/sg.git`;
    return stubbedReposService.cloneRepo(githubUrl, null, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      sinon.assert.calledTwice(existsStub);

      sinon.assert.notCalled(cloneStub);
      sinon.assert.calledOnce(cleanStub);
      sinon.assert.calledOnce(pullStub);
      sinon.assert.calledOnce(resetStub);
      sinon.assert.calledOnce(checkoutStub);

      return done();
    });
  }));

  it('should handle error during checkout', test(function (done: Function): void {
    const expectedError = 'Boo!';
    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, null);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, expectedError);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, null);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, null);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': () => {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      }
    });

    const githubUrl = `git@github.com:open-numbers/sg.git`;
    return stubbedReposService.cloneRepo(githubUrl, null, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch master and commit HEAD (repo url: ${githubUrl})`);

      sinon.assert.calledTwice(existsStub);

      sinon.assert.notCalled(cloneStub);
      sinon.assert.notCalled(cleanStub);
      sinon.assert.notCalled(pullStub);
      sinon.assert.calledOnce(resetStub);
      sinon.assert.calledOnce(checkoutStub);

      return done();
    });
  }));

  it('should handle pulling error on second call for some branch name during checkout to given commit', test(function (done: Function): void {
    const expectedError = 'Boo!';
    const branch = 'branch';
    const existsStub = this.stub(fs, 'exists').callsArgWithAsync(1, true);

    const resetStub = sinon.stub();
    resetStub.callsArgWithAsync(1, null);
    const checkoutStub = sinon.stub();
    checkoutStub.callsArgWithAsync(1, null);
    const pullStub = sinon.stub();
    pullStub
      .onFirstCall().callsArgWithAsync(0, null)
      .onSecondCall().callsArgWithAsync(2, expectedError);
    const cleanStub = sinon.stub();
    cleanStub.callsArgWithAsync(1, null);
    const cloneStub = sinon.stub();
    cloneStub.callsArgWithAsync(3, null);

    const stubbedReposService = proxyquire(reposServicePath, {
      'simple-git': () => {
        return {
          pull: pullStub,
          reset: resetStub,
          clean: cleanStub,
          checkout: checkoutStub,
          clone: cloneStub
        };
      }
    });

    const githubUrl = `git@github.com:open-numbers/sg.git#${branch}`;
    return stubbedReposService.cloneRepo(githubUrl, null, (error: string) => {
      expect(error).to.equal(`${expectedError} on branch ${branch} and commit HEAD (repo url: ${githubUrl})`);

      sinon.assert.calledTwice(existsStub);

      sinon.assert.notCalled(cloneStub);
      sinon.assert.calledOnce(cleanStub);
      sinon.assert.calledTwice(pullStub);
      sinon.assert.calledOnce(resetStub);
      sinon.assert.calledTwice(checkoutStub);

      return done();
    });
  }));
});
