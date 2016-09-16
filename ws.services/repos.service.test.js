'use strict';

const _ = require('lodash');
const path = require('path');
const chai = require('chai');
const proxyquire = require('proxyquire');
const config = require('../ws.config/config');
const reposService = require('../ws.services/repos.service');

const expect = chai.expect;

it('should hard checkout repo if it was cloned before', done => {
  const ddfRepoName = 'ddf--gapminder--systema_globalis';
  const ddfRepoCommitHash = 'bla1234';

  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'simple-git': function () {
      return {
        fetch: function (remote, branch) {
          expect(remote).to.equal('origin');
          expect(branch).to.equal('master');
          return this;
        },
        reset: function (options) {
          expect(options).to.deep.equal(['--hard', 'origin/master']);
          return this;
        },
        checkout: function (commit, done) {
          expect(commit).to.equal(ddfRepoCommitHash);
          done(null);
        }
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
  const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName);

  stubbedReposService.cloneRepo(githubUrl, ddfRepoCommitHash, (error, cloneResult) => {
    expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);
    done();
  });
});

//FIXME: Error: spawn git ENOENT
it('should respond with an error if cannot detect repo name for cloning', done => {
  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'fs': {
      exists: (pathTeRepo, done) => {
        const wasClonedBefore = false;
        done(wasClonedBefore);
      },
      mkdir: (pathTeRepo, done) => {
        const createReposDirError = null;
        done(createReposDirError);
      }
    }
  });

  stubbedReposService.cloneRepo('fake repo', 'any commit', error => {
    expect(error).to.equal('Cannot clone repo from fake repo');
    done();
  });
});

//FIXME: error: some error
it('should respond with an error if something wrong occurred during "git clone" invocation', done => {
  const ddfRepoName = 'ddf--gapminder--systema_globalis';
  const expectedGithubUrl = `git@github.com:open-numbers/${ddfRepoName}.git`;
  const accountName = 'open-numbers';
  const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName);

  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'simple-git': function () {
      return {
        clone: function (actualGithubUrl, pathToRepo, done) {
          expect(actualGithubUrl).to.equal(expectedGithubUrl);
          expect(pathToRepo).to.equal(expectedPathToRepo);
          done('some error');
          return this;
        }
      };
    },
    'fs': {
      exists: (pathTeRepo, done) => {
        const wasClonedBefore = false;
        done(wasClonedBefore);
      },
      mkdir: (pathTeRepo, done) => {
        const createReposDirError = null;
        done(createReposDirError);
      }
    }
  });

  stubbedReposService.cloneRepo(expectedGithubUrl, null, error => {
    expect(error).to.equal(`Cannot clone repo from ${expectedGithubUrl}`);
    done();
  });
});

it('should clone repo successfully (when no commit given to checkout - HEAD is used instead)', done => {
  const accountName = 'open-numbers';
  const expectedDdfRepoName = 'ddf--gapminder--systema_globalis';
  const expectedGithubUrl = `git@github.com:${accountName}/${expectedDdfRepoName}.git`;
  const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, expectedDdfRepoName);

  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'simple-git': function () {
      return {
        clone: function (actualGithubUrl, pathToRepo, done) {
          expect(actualGithubUrl).to.equal(expectedGithubUrl);
          expect(pathToRepo).to.equal(expectedPathToRepo);
          done(null);
          return this;
        },
        fetch: function (remote, branch) {
          expect(remote).to.equal('origin');
          expect(branch).to.equal('master');
          return this;
        },
        reset: function (options) {
          expect(options).to.deep.equal(['--hard', 'origin/master']);
          return this;
        },
        checkout: function (commit, done) {
          expect(commit).to.equal('HEAD');
          done(null);
        }
      };
    },
    'fs': {
      exists: (pathTeRepo, done) => {
        const wasClonedBefore = false;
        done(wasClonedBefore);
      },
      mkdir: (pathTeRepo, done) => {
        const createReposDirError = null;
        done(createReposDirError);
      }
    }
  });

  stubbedReposService.cloneRepo(expectedGithubUrl, null, (error, cloneResult) => {
    expect(cloneResult.pathToRepo).to.equal(expectedPathToRepo);
    done();
  });
});

it('should fail cloning if github url to ddf repo was not given', done => {
  const noGithubUrl = null;

  reposService.cloneRepo(noGithubUrl, 'any commit', error => {
    expect(error).to.equal('Github url was not given');
    done();
  });
});

it('TODO: should check repos dir if exists or not', () => {

});

it('should properly extract repo name from github url', () => {
  const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

  const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git`);

  expect(actualRepoName).to.equal(expectedDdfRepoName);
});

it('should throw away part .git from repo name', () => {
  const expectedDdfRepoName = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

  const actualRepoName = reposService.getRepoNameForDataset(expectedDdfRepoName);

  expect(_.endsWith(actualRepoName, '.git')).to.equal(false);
});

it('should properly extract path to repo stored locally', () => {
  const ddfRepoName = 'ddf--gapminder--systema_globalis';
  const accountName = 'open-numbers';

  const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName);
  const actualPathToRepo = reposService.getPathToRepo(`git@github.com:${accountName}/${ddfRepoName}`);

  expect(actualPathToRepo).to.equal(expectedPathToRepo);
});

it('should return falsy value as is when it was passed as a github url', () => {
  const falsyInputs = [0, '', false, null, undefined];

  falsyInputs.forEach(falsyInput => {
    expect(reposService.getPathToRepo(falsyInput)).to.equal(falsyInput);
  });
});
