import * as _ from 'lodash';
import * as async from 'async';
import {expect} from 'chai';
import * as fetch from 'node-fetch';
import * as shell from 'shelljs';
import {e2eEnv} from '../../e2e.env';
import {startWaffleServer as _startWaffleServer, stopWaffleServer, dropMongoDb as _dropMongoDb, waitForDefaultUser as _waitForDefaultUser} from '../../e2e.utils';
import * as path from 'path';

const packageJson = require('../../../package-lock.json');
const wsCLIVersion = _.get(packageJson, `dependencies['waffle-server-import-cli'].version`, null);

const dbDumpMasterPenultimateCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-penultimate-commit-a003ffc.gz');
const dbDumpMasterLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-last-commit-e6ef10e.gz');
const dbDumpDefaultLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-default-last-commit-e6ef10e.gz');
const dbDumpTwinLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-twin-last-commit-9af6a48.gz');
const dbDumpTempLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-temp-last-commit-e6ef10e.gz');
const dbDumpNotExisted = path.resolve(__dirname, './fixtures/db-test-dump-not-existed-repo.gz');

expect(wsCLIVersion).to.not.empty;

// Test cases for general flow
describe('Import flow: For DB with dumps (existed dataset)', () => {
  const errorMessageRegexp = /Dataset exists, cannot import same dataset twice/;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  describe('For dump with branch (#master) - last commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpMasterLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', async () => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset with branch, without version', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset without branch and version (just with "#") if master branch had been already imported', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });
  });

  describe('For dump with branch (#master) - penultimate commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpMasterPenultimateCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', async () => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset with branch, without version', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset without branch and version (just with "#") if master branch had been already imported', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });
  });

  describe('For default dump (without  branch (#master)) - last commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpDefaultLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', async () => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset with branch, without version', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset without branch and version (just with "#") if master branch had been already imported', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });
  });

  describe('For dump with branch (#master-twin-for-e2e) - last commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpTwinLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', async () => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master-twin-for-e2e', commit: '9af6a48'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });

    it('should not import existed dataset with branch, without version', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master-twin-for-e2e'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });
  });
});

describe('Import flow: For empty DB', () => {
  const importMessageRegexp = /Dataset importing is in progress \.\.\./;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  beforeEach((done: Function) => {
    startWaffleServer(null, true, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  it('should start import dataset with branch and version', async() => {
    const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'};
    const response = await makeImportRequest(query);

    expectMessageResponse(response, importMessageRegexp);
  });

  it('should start import dataset with branch, without version', async() => {
    const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master'};
    const response = await makeImportRequest(query);

    expectMessageResponse(response, importMessageRegexp);
  });

  it('should start import dataset without branch and version', async() => {
    const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git'};
    const response = await makeImportRequest(query);

    expectMessageResponse(response, importMessageRegexp);
  });
});

describe('Import flow: For DB with another branch dataset', () => {
  const importMessageRegexp = /Dataset importing is in progress \.\.\./;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  beforeEach((done: Function) => {
    startWaffleServer(dbDumpTwinLastCommitPath, false, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  it('should start import dataset with branch and version', async() => {
    const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master',  commit: 'a003ffc'};
    const response = await makeImportRequest(query);

    expectMessageResponse(response, importMessageRegexp);
  });

  it('should start import dataset with branch, without version', async() => {
    const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master'};
    const response = await makeImportRequest(query);

    expectMessageResponse(response, importMessageRegexp);
  });

  it('should start import dataset without branch and version', async() => {
    const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git'};
    const response = await makeImportRequest(query);

    expectMessageResponse(response, importMessageRegexp);
  });
});

// Specific test cases for extreme points
describe('Import flow: For not existed dataset in github (but valid name)', () => {
  const errorMessageRegexp = /Repository not found/m;
  const errorExistDatasetRegexp = /Dataset exists, cannot import same dataset twice/;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  describe('Dataset was not imported before and does not exist in github', () => {
    it('should not start import for not existed dataset (with valid name)', async() => {
      const query = {github: 'git@github.com:not-existed-valid-dataset/not-existed-valid-dataset.git#master'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });
  });

  describe('Dataset was imported before and now it was removed from github', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpNotExisted}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not start import for not existed dataset with version (with valid name) even it was imported before removing from git hub', async() => {
      const query = {github: 'git@github.com:not-existed-valid-dataset/not-existed-valid-dataset.git#master', commit: 'e6ef10e'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorExistDatasetRegexp);
    });

    it('should not start import for not existed dataset without version (with valid name) even it was imported before removing from git hub', async() => {
      const query = {github: 'git@github.com:not-existed-valid-dataset/not-existed-valid-dataset.git#master'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorMessageRegexp);
    });
  });
});

describe('Import flow: For not existed branch in dataset', () => {
  const errorExistDatasetRegexp = /Dataset exists, cannot import same dataset twice/;
  const errorNotFoundRemoteRegexp = /Remote branch .*? not found in upstream origin/m;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  describe('Branch was imported before, but for now it was deleted in github', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpTempLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import not existed branch', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master-temp', commit: 'e6ef10e'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorExistDatasetRegexp);
    });
  });

  describe('Branch does not exist', () => {
    before((done: Function) => {
      startWaffleServer(null, true, done);
    });

    it('should not import existed dataset with not existed branch', async() => {
      const query = {github: 'git@github.com:VS-work/ddf--ws-testing.git#master-temp'};
      const response = await makeImportRequest(query);

      expectErrorResponse(response, errorNotFoundRemoteRegexp);
    });
  });
});

describe('Import flow: Without specifying dataset in request', () => {
  const errorRepoRegexp = /You must specify a repository to clone/;
  const errorRequiredNameRegexp = /Datasets validation failed: name: Path `name` is required./;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  it('should not import without git repository and commit', async() => {
    const query = null;
    const response = await makeImportRequest(query);

    expectErrorResponse(response, errorRepoRegexp);
  });

  it('should not import without git repository, only with commit', async() => {
    const query = {commit: 'e6ef10e'};
    const response = await makeImportRequest(query);

    expectErrorResponse(response, errorRequiredNameRegexp);
  });
});

function expectErrorResponse (response: any, errRegexp: RegExp): void {
  const {error, message} = response;
  expect(message).to.not.exist;
  expect(error).to.not.empty;
  expect(errRegexp.test(error)).to.be.true;
}

function expectMessageResponse (response: any, msgRegexp: RegExp): void {
  const {error, message} = response;
  expect(error).to.not.exist;
  expect(message).to.not.empty;
  expect(msgRegexp.test(message)).to.be.true;
}

function makeImportRequest (params: {github?: string, commit?: string}): Promise<any> {
  return new Promise((resolve: Function, reject: Function) => {
    _waitForDefaultUser(0, async (err: Error, {token}: {token: string}) => {
      if (err) {
        return reject(err);
      }

      const response = await sendImportQueryToWs(params, token);
      resolve(response);
    });
  });
}

function sendImportQueryToWs(query: {github?: string, commit?: string}, token: string): any {
  expect(token).to.not.empty;

  return fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/import-dataset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gapminder-WSCLI-Version': wsCLIVersion
    },
    body: JSON.stringify(_.extend({
      repoType: 'public',
      'waffle-server-token': token
    }, query))
  }).then((response: any) => {
    return response.json();
  }).then((response: any) => {
    return response;
  }).catch((error: any) => {
    throw new Error(error);
  });
}

function dropMongoDb (isDrop: boolean, _done: Function): any {
  if(isDrop) {
    return _dropMongoDb(_done);
  }
  return async.setImmediate(() => _done());
}

function waitForDefaultUser (isWait: boolean, _done: Function): any {
  if(!isWait) {
    return  _waitForDefaultUser(0, _done);
  }
  return async.setImmediate(() => _done());
}

function restoreDbFromDump (dbDumpPath: string, _done: Function): any{
  if(dbDumpPath) {
    shell.exec(`mongorestore --drop --gzip --archive=${dbDumpPath}`);
    expect(shell.error()).to.not.exist;

    return async.setImmediate(() => _done());
  }
  return async.setImmediate(() => _done());
}

function startWaffleServer (dbDumpPath: string, dropDb: boolean, done: Function): any {
  async.series([
    async.apply(dropMongoDb, dropDb),
    stopWaffleServer,
    (async as any).asyncify(_startWaffleServer),
    async.apply(waitForDefaultUser, !dropDb),
    async.apply(restoreDbFromDump, dbDumpPath)
  ], (error: string) => {
    return done(error);
  });
}
