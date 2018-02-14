import 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';
import * as autoDeployHelpers from '../../deployment/gcp_scripts/autodeploy.helpers';
import { ChildProcess } from 'child_process';
import { ExecOutputReturnValue } from 'shelljs';
import * as async from 'async';

let expectedError: string | null = null;

function runShellCommandFn(command: string, options: any, cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess | string, string>): void {
  return async.setImmediate(() => cb(expectedError, command));
}

describe('setup', () => {
  let runShellCommandStub;

  beforeEach(() => {
    expectedError = null;
    runShellCommandStub = sinon.stub(commonHelpers, 'runShellCommand').callsFake(runShellCommandFn);
  });

  afterEach(() => {
    runShellCommandStub.restore();
  });


  describe('setDefaultUser Command', () => {
    const externalContextStub = { COMPUTED_VARIABLES: { OWNER_ACCOUNT: 'test.owner.account' } };

    it('create command and pass to runShellCommand', (done: Function) => {
      const expectedOwnerAccount = externalContextStub.COMPUTED_VARIABLES.OWNER_ACCOUNT;
      const expectedOptions = {};

      autoDeployHelpers.setDefaultUser(externalContextStub, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, sinon.match(expectedOwnerAccount), expectedOptions);

        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });

    it('pass error in callback', (done: Function) => {
      expectedError = 'ERROR';

      autoDeployHelpers.setDefaultUser(externalContextStub, (error: string, externalContext: any) => {
        expect(error).to.equal(expectedError);
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });
  });

  describe('createProject Command', () => {
    const externalContextStub = {
      PROJECT_ID: 'TEST_PROJECT_ID',
      FOLDER_ID: 'TEST_FOLDER_ID',
      PROJECT_LABELS: 'TEST_PROJECT_LABELS'
    };

    it('use FOLDER_ID as folder flag', (done: Function) => {
      const expectedCommand = `gcloud projects create ${externalContextStub.PROJECT_ID} --folder=${externalContextStub.FOLDER_ID} --labels=${externalContextStub.PROJECT_LABELS} --name=${externalContextStub.PROJECT_ID} --enable-cloud-apis`;
      const expectedOptions = {};

      autoDeployHelpers.createProject(externalContextStub, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, expectedCommand, expectedOptions);

        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });

    it('folder flag is ignored when folderId was NOT set', (done: Function) => {
      const externalContextWithoutFolderID = { ...externalContextStub };
      delete externalContextWithoutFolderID.FOLDER_ID;

      const expectedCommand = `gcloud projects create ${externalContextStub.PROJECT_ID}  --labels=${externalContextStub.PROJECT_LABELS} --name=${externalContextStub.PROJECT_ID} --enable-cloud-apis`;
      const expectedOptions = {};

      autoDeployHelpers.createProject(externalContextWithoutFolderID, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, expectedCommand, expectedOptions);

        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextWithoutFolderID);
        done();
      });
    });

    it('skip the step when project ID is in use by another project', (done: Function) => {
      expectedError = 'The project ID you specified is already in use by another project';
      autoDeployHelpers.createProject(externalContextStub, (error: string, externalContext: any) => {
        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });

    it('pass error in callback', (done: Function) => {
      expectedError = 'ERROR';

      autoDeployHelpers.createProject(externalContextStub, (error: string, externalContext: any) => {
        expect(error).to.equal(expectedError);
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });
  });

  describe('setDefaultProject Command', () => {
    const externalContextStub = {
      PROJECT_ID: 'TEST_PROJECT_ID'
    };

    it('create command and pass to runShellCommand', (done: Function) => {
      const expectedProjectID = externalContextStub.PROJECT_ID;
      const expectedOptions = {};

      autoDeployHelpers.setDefaultProject(externalContextStub, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, sinon.match(expectedProjectID), expectedOptions);

        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });

    it('pass error in callback', (done: Function) => {
      expectedError = 'ERROR';

      autoDeployHelpers.setDefaultProject(externalContextStub, (error: string, externalContext: any) => {
        expect(error).to.equal(expectedError);
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });
  });

  describe('setupAPIs Command', () => {
    const externalContextStub = { PROJECT_ID: 'TEST_PROJECT_ID' };
    const apisListStub = ['cloudbilling.googleapis.com'];
    const apisOptions = { action: 'enable' };

    it('create command and pass to runShellCommand', (done: Function) => {
      const expectedCommand = `gcloud services ${apisOptions.action} ${apisListStub[0]}`;
      const expectedOptions = {};

      autoDeployHelpers.setupAPIs(apisListStub, apisOptions, externalContextStub, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, expectedCommand, expectedOptions);

        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });

    it('pass error in callback', (done: Function) => {
      expectedError = 'ERROR';

      autoDeployHelpers.setupAPIs(apisListStub, apisOptions, externalContextStub, (error: string, externalContext: any) => {
        expect(error).to.equal(expectedError);
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });
  });

  describe('linkProjectToBilling Command', () => {
    const externalContextStub = {
      PROJECT_ID: 'TEST_PROJECT_ID',
      COMPUTED_VARIABLES: {
        BILLING_ACCOUNT: 'TEST_BILLING_ACCOUNT'
      }
    };

    it('create command and pass to runShellCommand', (done: Function) => {
      const expectedCommand = `gcloud beta billing projects link ${externalContextStub.PROJECT_ID} --billing-account=${externalContextStub.COMPUTED_VARIABLES.BILLING_ACCOUNT}`;
      const expectedOptions = {};

      autoDeployHelpers.linkProjectToBilling(externalContextStub, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, expectedCommand, expectedOptions);

        expect(error).to.be.an('null');
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });

    it('pass error in callback', (done: Function) => {
      expectedError = 'ERROR';

      autoDeployHelpers.linkProjectToBilling(externalContextStub, (error: string, externalContext: any) => {
        expect(error).to.equal(expectedError);
        expect(externalContext).to.equal(externalContextStub);
        done();
      });
    });
  });

});
