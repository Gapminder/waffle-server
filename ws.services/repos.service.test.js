import _ from 'lodash';
import test from 'ava';
import path from 'path';
import proxyquire from 'proxyquire';

import config from '../ws.config/config';
import reposService from '../ws.services/repos.service';

test.cb('should hard checkout repo if it was cloned before', assert => {
  const ddfRepoName = 'ddf--gapminder--systema_globalis';
  const ddfRepoCommitHash = 'bla1234';

  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'simple-git': function () {
      return {
        fetch: function(remote, branch) {
          assert.is(remote, 'origin');
          assert.is(branch, 'master');
          return this;
        },
        reset: function(options) {
          assert.deepEqual(options, ['--hard', 'origin/master']);
          return this;
        },
        checkout: function(commit, done) {
          assert.is(commit, ddfRepoCommitHash);
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
    assert.is(cloneResult.pathToRepo, expectedPathToRepo);
    assert.end();
  });
});

//FIXME: Error: spawn git ENOENT
test.skip.cb('should respond with an error if cannot detect repo name for cloning', assert => {
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
    assert.is(error, 'Cannot clone repo from fake repo');
    assert.end();
  });
});

//FIXME: error: some error
test.skip.cb('should respond with an error if something wrong occurred during "git clone" invocation', assert => {
  const ddfRepoName = 'ddf--gapminder--systema_globalis';
  const expectedGithubUrl = `git@github.com:open-numbers/${ddfRepoName}.git`;

  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'simple-git': function () {
      return {
        clone: function(actualGithubUrl, repoName, done) {
          assert.is(actualGithubUrl, expectedGithubUrl);
          assert.is(repoName, ddfRepoName);
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
    assert.is(error, `Cannot clone repo from ${expectedGithubUrl}`);
    assert.end();
  });
});

test.cb('should clone repo successfully (when no commit given to checkout - HEAD is used instead)', assert => {
  const accountName = 'open-numbers';
  const expectedDdfRepoName = 'ddf--gapminder--systema_globalis';
  const expectedGithubUrl = `git@github.com:${accountName}/${expectedDdfRepoName}.git`;
  const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, expectedDdfRepoName);

  const stubbedReposService = proxyquire('../ws.services/repos.service', {
    'simple-git': function () {
      return {
        clone: function(actualGithubUrl, pathToRepo, done) {
          assert.is(actualGithubUrl, expectedGithubUrl);
          assert.is(pathToRepo, expectedPathToRepo);
          done(null);
          return this;
        },
        fetch: function(remote, branch) {
          assert.is(remote, 'origin');
          assert.is(branch, 'master');
          return this;
        },
        reset: function(options) {
          assert.deepEqual(options, ['--hard', 'origin/master']);
          return this;
        },
        checkout: function(commit, done) {
          assert.is(commit, 'HEAD');
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
    assert.is(cloneResult.pathToRepo, expectedPathToRepo);
    assert.end();
  });
});

test.cb('should fail cloning if github url to ddf repo was not given', assert => {
  const noGithubUrl = null;

  reposService.cloneRepo(noGithubUrl, 'any commit', error => {
    assert.is(error, 'Github url was not given');
    assert.end();
  });
});

test.todo('should check repos dir if exists or not');

test('should properly extract repo name from github url', assert => {
  const expectedDdfRepoName = 'open-numbers/ddf--gapminder--systema_globalis';

  const actualRepoName = reposService.getRepoNameForDataset(`git@github.com:open-numbers/ddf--gapminder--systema_globalis.git`);

  assert.is(actualRepoName, expectedDdfRepoName);
});

test('should throw away part .git from repo name', assert => {
  const expectedDdfRepoName = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

  const actualRepoName = reposService.getRepoNameForDataset(expectedDdfRepoName);

  assert.false(_.endsWith(actualRepoName, '.git'));
});

test('should properly extract path to repo stored locally', assert => {
  const ddfRepoName = 'ddf--gapminder--systema_globalis';
  const accountName = 'open-numbers';

  const expectedPathToRepo = path.resolve(process.cwd(), config.PATH_TO_DDF_REPOSITORIES, accountName, ddfRepoName);
  const actualPathToRepo = reposService.getPathToRepo(`git@github.com:${accountName}/${ddfRepoName}`);

  assert.is(actualPathToRepo, expectedPathToRepo);
});

test('should return falsy value as is when it was passed as a github url', assert => {
  const falsyInputs = [0, '', false, null, undefined];

  falsyInputs.forEach(falsyInput => {
    assert.is(reposService.getPathToRepo(falsyInput), falsyInput);
  });
});
