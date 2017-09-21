import * as _ from 'lodash';
import * as async from 'async';
import {expect} from 'chai';
import * as fetch from 'node-fetch';
import * as shell from 'shelljs';
import {e2eEnv} from '../../e2e.env';
import {startWaffleServer as _startWaffleServer, stopWaffleServer, dropMongoDb, waitForDefaultUser} from '../../e2e.utils';
import * as path from 'path';

const packageJson = require('../../../package-lock.json');
const wsCLIVersion = _.get(packageJson, `dependencies['waffle-server-import-cli'].version`, null);

const dbDumpMasterPenultimateCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-penultimate-commit-a003ffc.gz');
const dbDumpMasterLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-last-commit-e6ef10e.gz');
const dbDumpDefaultLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-default-last-commit-e6ef10e.gz');
const dbDumpTwinLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-twin-last-commit-9af6a48.gz');
const dbDumpTempLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-temp-last-commit-e6ef10e.gz');

expect(wsCLIVersion).to.not.empty;

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

    it('should not import existed dataset with branch and version', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset with branch, without version', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset without branch and version (just with "#") if master branch had been already imported', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#'}, errorMessageRegexp, done);
    });
  });

  describe('For dump with branch (#master) - penultimate commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpMasterPenultimateCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset with branch, without version', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset without branch and version (just with "#") if master branch had been already imported', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#'}, errorMessageRegexp, done);
    });
  });

  describe('For default dump (without  branch (#master)) - last commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpDefaultLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset with branch, without version', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, errorMessageRegexp, done);
    });

    it('should not import existed dataset without branch and version (just with "#") if master branch had been already imported', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#'}, errorMessageRegexp, done);
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

  it('should start import dataset with branch and version', (done: Function) => {
    expectMessageResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master',  commit: 'a003ffc'}, importMessageRegexp, done);
  });

  it('should start import dataset with branch, without version', (done: Function) => {
    expectMessageResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, importMessageRegexp, done);
  });

  it('should start import dataset without branch and version', (done: Function) => {
    expectMessageResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, importMessageRegexp, done);
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

  it('should start import dataset with branch and version', (done: Function) => {
    expectMessageResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master',  commit: 'a003ffc'}, importMessageRegexp, done);
  });

  it('should start import dataset with branch, without version', (done: Function) => {
    expectMessageResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, importMessageRegexp, done);
  });

  it('should start import dataset without branch and version', (done: Function) => {
    expectMessageResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, importMessageRegexp, done);
  });
});

describe('Import flow: For not existed dataset in github (but valid name)', () => {
  const errorMessageRegexp = /Repository not found/m;

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

  after((done: Function) => {
    stopWaffleServer(done);
  });

  it('should not start import for not existed dataset (with valid name)', (done: Function) => {
    expectErrorResponse({github: 'git@github.com:not-existed-valid-dataset/not-existed-valid-dataset/.git#master'}, errorMessageRegexp, done);
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

  describe('Branch was imported before, but for now it had been deleted in github', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpTempLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import not existed branch', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master-temp', commit: 'e6ef10e'}, errorExistDatasetRegexp, done);
    });
  });

  describe('Branch does not exist', () => {
    before((done: Function) => {
      startWaffleServer(null, true, done);
    });
    it('should not import existed dataset with not existed branch', (done: Function) => {
      expectErrorResponse({github: 'git@github.com:VS-work/ddf--ws-testing.git#master-temp'}, errorNotFoundRemoteRegexp, done);
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

  it('should not import without git repository and commit', (done: Function) => {
    expectErrorResponse(null, errorRepoRegexp, done);
  });

  it('should not import without git repository, only with commit', (done: Function) => {
    expectErrorResponse({commit: 'e6ef10e'}, errorRequiredNameRegexp, done);
  });
});

function expectErrorResponse (reqParams: {github?: string, commit?: string}, errRegexp: RegExp, done: Function): any {
  return makeImportRequest(reqParams, (_error: string, {error}: any) => {
    expect(_error).to.not.exist;
    expect(error).to.not.empty;
    expect(errRegexp.test(error)).to.be.true;
    return done();
  });
}

function expectMessageResponse (reqParams: {github?: string, commit?: string}, msgRegexp: RegExp, done: Function): any {
  return makeImportRequest(reqParams, (error: string, {message}: any) => {
    expect(error).to.not.exist;
    expect(message).to.not.empty;
    expect(msgRegexp.test(message)).to.be.true;
    return done();
  });
}

function makeImportRequest (params: {github?: string, commit?: string}, done: Function): any {
  async.waterfall([
    async.constant(0),
    waitForDefaultUser,
    (authData: any, _done: Function) => {
      const {token} = authData;
      expect(token).to.not.empty;

      fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/import-dataset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gapminder-WSCLI-Version': wsCLIVersion
        },
        body: JSON.stringify(_.extend({
          repoType: 'public',
          'waffle-server-token': token
        }, params))
      }).then((response: any) => {
        return response.json();
      }).then((response: any) => {
        return _done(null, response);
      });
    }
  ], (error: Error, response: any) => {
    expect(error).to.not.exist;
    return done(error, response);
  });
}

function startWaffleServer(dbDumpPath: string, dropDb: boolean, done: Function): void {
  async.series([
    (_done: Function) => setTimeout(() => {
      if(dropDb) {
        return dropMongoDb(_done);
      }
      return _done();
    }, 100),
    stopWaffleServer,
    (_done: Function) => setTimeout(() => {
      _startWaffleServer();
      return _done();
    }, 100),
    (_done: Function) => setTimeout(() => {
      if(!dropDb) {
        return  waitForDefaultUser(0, _done);
      }
      return _done();
    }, 100),
    (_done: Function) => setTimeout(() => {
      if(dbDumpPath) {
        shell.exec(`mongorestore --drop --gzip --archive=${dbDumpPath}`);
        expect(shell.error()).to.not.exist;
        return _done();
      }
      return _done();
    }, 100)
  ], (error: string) => {
    return done(error);
  });
}
