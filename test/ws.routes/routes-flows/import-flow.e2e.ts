import * as _ from 'lodash';
import * as async from 'async';
import {expect} from 'chai';
import * as fetch from 'node-fetch';
import * as shell from 'shelljs';
import {logger} from '../../../ws.config/log';
import {e2eEnv} from '../../e2e.env';
import {startWaffleServer as _startWaffleServer, stopWaffleServer as _stopWaffleServer, dropMongoDb} from '../../e2e.utils';
import * as path from 'path';

const packageJson = require('../../../package-lock.json');
const wsCLIVersion = _.get(packageJson, `dependencies['waffle-server-import-cli'].version`, null);

const dbDumpMasterPenultimateCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-penultimate-commit-a003ffc.gz');
const dbDumpMasterLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-master-last-commit-e6ef10e.gz');
const dbDumpDefaultLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-default-last-commit-e6ef10e.gz');
const dbDumpTwinLastCommitPath = path.resolve(__dirname, './fixtures/db-test-dump-twin-last-commit-9af6a48.gz');

expect(wsCLIVersion).to.not.empty;

xdescribe('Import flow: For DB with dumps (existed dataset)', () => {
  const errorMessage = 'Dataset exists, cannot import same dataset twice';

  function errorImportExpectation (reqParams: {github?: string, commit?: string}, done: Function): any {
    return makeImportRequest(reqParams, (_error: string, {error}: any) => {
      expect(_error).to.not.exist;
      expect(error).to.not.empty;
      expect(error).equal(errorMessage);
      return done();
    });
  }

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
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'}, done);
    });

    it('should not import existed dataset with branch, without version', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, done);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, done);
    });
  });

  describe('For dump with branch (#master) - penultimate commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpMasterPenultimateCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'}, done);
    });

    it('should not import existed dataset with branch, without version', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, done);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, done);
    });
  });

  describe('For default dump (without  branch (#master)) - last commit', () => {
    before((done: Function) => {
      shell.exec(`mongorestore --drop --gzip --archive=${dbDumpDefaultLastCommitPath}`);
      expect(shell.error()).to.not.exist;
      done();
    });

    it('should not import existed dataset with branch and version', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master', commit: 'a003ffc'}, done);
    });

    it('should not import existed dataset with branch, without version', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, done);
    });

    it('should not import existed dataset without branch and version if master branch had been already imported', (done: Function) => {
      errorImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, done);
    });
  });
});

xdescribe('Import flow: For empty DB', () => {
  const importMessage = 'Dataset importing is in progress ...';

  function startImportExpectation (reqParams: {github?: string, commit?: string}, done: Function): any {
    return makeImportRequest(reqParams, (error: string, {message}: any) => {
      expect(error).to.not.exist;
      expect(message).to.not.empty;
      expect(message).equal(importMessage);
      return done();
    });
  }

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
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master',  commit: 'a003ffc'}, done);
  });

  it('should start import dataset with branch, without version', (done: Function) => {
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, done);
  });

  it('should start import dataset without branch and version', (done: Function) => {
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, done);
  });
});

xdescribe('Import flow: For DB with another branch dataset', () => {
  const importMessage = 'Dataset importing is in progress ...';

  function startImportExpectation (reqParams: {github?: string, commit?: string}, done: Function):any {
    return makeImportRequest(reqParams, (error: string, {message}: any) => {
      expect(error).to.not.exist;
      expect(message).to.not.empty;
      expect(message).equal(importMessage);
      return done();
    });
  }

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
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master',  commit: 'a003ffc'}, done);
  });

  it('should start import dataset with branch, without version', (done: Function) => {
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master'}, done);
  });

  it('should start import dataset without branch and version', (done: Function) => {
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git'}, done);
  });
});

describe('Import flow: For not existed dataset on github, but valid name', () => {
  const importMessage = 'Dataset importing is in progress ...';

  function startImportExpectation (reqParams: {github?: string, commit?: string}, done: Function):any {
    return makeImportRequest(reqParams, (error: string, {message}: any) => {
      expect(error).to.not.exist;
      expect(message).to.not.empty;
      expect(message).equal(importMessage);
      return done();
    });
  }

  before((done: Function) => {
    startWaffleServer(null, false, done);
  });

 /* beforeEach((done: Function) => {
    startWaffleServer(dbDumpTwinLastCommitPath, false, done);
  });*/

  after((done: Function) => {
    stopWaffleServer(done);
  });

  it('should start import dataset with branch and version', (done: Function) => {
    startImportExpectation({github: 'git@github.com:VS-work/ddf--ws-testing.git#master',  commit: 'a003ffc'}, done);
  });
});

function makeImportRequest (params: {github?: string, commit?: string}, done: Function): any {
  waitForDefaultUser(0, (error: string, { token }: any) => {
    expect(error).to.not.exist;
    expect(token).to.not.empty;

    fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/import-dataset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gapminder-WSCLI-Version': wsCLIVersion
      },
      body: JSON.stringify( _.extend({
        repoType: 'public',
        'waffle-server-token': token
      }, params))
    }).then((response: any) => {
      return response.json();
    }).then((response: any) => {
      return done(null, response);
    });
  });
}

function waitForDefaultUser(counter: number, done: Function): void {
  fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({email: e2eEnv.login, password: e2eEnv.pass})
  }).then((response: any) => {
    return response.json();
  }).then((response: any) => {
    if (!response.success) {
      logger.warn(response.error);
    }

    if (response.success) {
      logger.info(response, 'Connect to WS successfully');
      return done(null, response.data);
    }

    if (counter > 10000) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += 2000;
      waitForDefaultUser(counter, done);
    }, 2000);
  }).catch((error: any) => {
    if (error) {
      logger.warn(error);
    }

    if (counter > 10000) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += 2000;
      waitForDefaultUser(counter, done);
    }, 2000);
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

function stopWaffleServer(done: Function): void {
  _stopWaffleServer((error: string) => {
    async.setImmediate(() => {
      if (error) {
        return done(error);
      }

      return done(null);
    });
  });
}
