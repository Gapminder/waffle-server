import 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import _ = require('lodash');
import * as commonHelpers from '../../deployment/common.helpers';
import * as autoDeployHelpers from '../../deployment/autodeploy.helpers';
import { expectNoEmptyParamsInCommand, hasFlag } from './testUtils';
import { loggerFactory } from '../../ws.config/log';

import { pathToLoadBalancerIP, pathToTMNetworkIP } from '../../deployment/autodeploy.helpers';

const sandbox = sinon.createSandbox();

describe('Autodeploy.helper Commands', () => {
  let loggerStub;

  beforeEach(() => {
    loggerStub = {info: sandbox.stub(), error: sandbox.stub, warn: sandbox.stub()};
    sandbox.stub(loggerFactory, 'getLogger').returns(loggerStub);
  });

  afterEach(() => sandbox.restore());

  it('createProject: use FOLDER_ID as folder flag', (done: Function) => {
    const expectedContext = {
      PROJECT_ID: 'TEST_PROJECT_ID',
      PROJECT_NAME: 'TEST_PROJECT_NAME',
      PROJECT_LABELS: 'TEST_PROJECT_NAME',
      FOLDER_ID: 'TEST_FOLDER_ID'
    };
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null);
    autoDeployHelpers.createProject({ ...expectedContext }, (error: string, externalContext: any) => {

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledWithExactly(runShellCommandStub, expectNoEmptyParamsInCommand.and(hasFlag('folder')), sinon.match.object, sinon.match.func);

      done();
    });
  });

  it('createProject: folder flag is ignored when folderId was NOT set', (done: Function) => {
    const expectedContext = {
      PROJECT_ID: 'TEST_PROJECT_ID',
      PROJECT_NAME: 'TEST_PROJECT_NAME',
      PROJECT_LABELS: 'TEST_PROJECT_NAME'
    };
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null);

    autoDeployHelpers.createProject({ ...expectedContext }, (error: string, externalContext: any) => {

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledOnce(runShellCommandStub);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand);

      done();
    });
  });

  it('createProject: skip the step when project ID is in use by another project', (done: Function) => {
    const expectedContext = {
      PROJECT_NAME: 'TEST_PROJECT_NAME',
      PROJECT_LABELS: 'TEST_PROJECT_NAME',
      FOLDER_ID: 'TEST_FOLDER_ID'
    };

    const expectedError = 'The project ID you specified is already in use by another project';
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, expectedError);

    autoDeployHelpers.createProject({ ...expectedContext }, (error: string, externalContext: any) => {

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledOnce(runShellCommandStub);
      sinon.assert.calledWithExactly(loggerStub.info, 'RESULT: So, skipping the step..');

      done();
    });
  });

  it('createProject: error', (done: Function) => {
    const expectedContext = {
      PROJECT_NAME: 'TEST_PROJECT_NAME',
      PROJECT_LABELS: 'TEST_PROJECT_NAME',
      FOLDER_ID: 'TEST_FOLDER_ID'
    };

    const expectedError = 'ERROR';
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, expectedError, expectedContext);

    autoDeployHelpers.createProject({ ...expectedContext }, (error: string, externalContext: any) => {

      expect(error).to.equal(expectedError);
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledOnce(runShellCommandStub);

      done();
    });
  });

  it('setupAPIs: use apisList from patched arguments', (done: Function) => {
    const IGNORE_ENABLING_GCP_API = process.env.IGNORE_ENABLING_GCP_API;
    process.env.IGNORE_ENABLING_GCP_API = 'false';
    const expectedContext = {
      PROJECT_NAME: 'TEST_PROJECT_NAME',
      PROJECT_LABELS: 'TEST_PROJECT_NAME',
      FOLDER_ID: 'TEST_FOLDER_ID'
    };
    const apisListStub = ['cloudbilling.googleapis.com'];
    const apisOptions = { action: 'enable' };
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null);

    autoDeployHelpers.setupAPIs(apisListStub, apisOptions, { ...expectedContext }, (error: string, externalContext: any) => {

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledOnce(runShellCommandStub);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand);

      process.env.IGNORE_ENABLING_GCP_API = IGNORE_ENABLING_GCP_API;
      done();
    });
  });

  it('getTMExternalIP: use natIP', (done: Function) => {
    const ip = '11.11.11.111';
    const runShellCommandResult = {
      stdout: JSON.stringify({
        networkInterfaces: [{
          accessConfigs: [{ natIP: ip }]
        }]
      })
    };
    const initialContext = {
      TM_INSTANCE_VARIABLES: {
        IMAGE_URL: 'TEST_IMAGE_URL',
        NODE_NAME: 'TM_INSTANCE_NAME'
      },
      TM_ZONE: 'TEST_TM_ZONE',
      PROJECT_ID: 'TEST_PROJECT_ID'
    };
    const expectedContext = {
      TM_INSTANCE_VARIABLES: {
        IMAGE_URL: 'TEST_IMAGE_URL',
        NODE_NAME: 'TM_INSTANCE_NAME',
        IP_ADDRESS: ip // this should be added
      },
      TM_ZONE: 'TEST_TM_ZONE',
      PROJECT_ID: 'TEST_PROJECT_ID'
    };
    const expectedOptions = { pathsToCheck: [pathToTMNetworkIP] };

    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null, runShellCommandResult);

    autoDeployHelpers.getTMExternalIP(initialContext, (error: string, externalContext: any) => {

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand, expectedOptions);

      done();
    });
  });

  it('getTMExternalIP: pass the error if so; context not changed', (done: Function) => {
    const expectedError = 'No required data by path';
    const runShellCommandResult = {
      stdout: JSON.stringify({
        networkInterfaces: [{
          accessConfigs: [{ natIP: '11' }]
        }]
      })
    };
    const expectedContext = Object.freeze({
      TM_INSTANCE_VARIABLES: Object.freeze({
        IMAGE_URL: 'TEST_IMAGE_URL',
        NODE_NAME: 'TM_INSTANCE_NAME'
      }),
      TM_ZONE: 'TEST_TM_ZONE',
      PROJECT_ID: 'TEST_PROJECT_ID'
    });
    const expectedOptions = { pathsToCheck: [pathToTMNetworkIP] };
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, expectedError, runShellCommandResult);

    autoDeployHelpers.getTMExternalIP(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {

      expect(error).to.equal(expectedError);
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand, expectedOptions);

      done();
    });
  });

  it('getTMExternalIP: error with JSON parse stdout', (done: Function) => {
    const runShellCommandResult = 'json';
    const expectedContext = Object.freeze({
      TM_INSTANCE_VARIABLES: Object.freeze({
        IMAGE_URL: 'TEST_IMAGE_URL',
        NODE_NAME: 'TM_INSTANCE_NAME'
      }),
      TM_ZONE: 'TEST_TM_ZONE',
      PROJECT_ID: 'TEST_PROJECT_ID'
    });
    const expectedOptions = { pathsToCheck: [pathToTMNetworkIP] };
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null, runShellCommandResult);

    autoDeployHelpers.getTMExternalIP(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {

      expect(error).to.equal('Unexpected token u in JSON at position 0');
      expect(externalContext).to.deep.equal(expectedContext);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand, expectedOptions);

      done();
    });
  });

  it('printExternalIPs: return loadBalancer ip address', (done: Function) => {
    const ip = '22.22.22.22';
    const runShellCommandResult = {
      stdout: JSON.stringify({
        status: {
          loadBalancer: { ingress: [{ ip }] }
        },
        networkInterfaces: [{
          accessConfigs: [{ natIP: '35.205.183.154' }],
          subnetwork: `https://www.googleapis.com/compute/beta/projects/regions/subnetworks/default`,
          networkIP: '192.127.0.2'
        }]
      })
    };
    const initialContext = {
      TM_INSTANCE_VARIABLES: {
        IP_ADDRESS: 'TM_IP_ADDRESS'
      },
      LOAD_BALANCER_NAME: 'TEST_TM_ZONE'
    };
    const expectedOptions = { pathsToCheck: [pathToLoadBalancerIP] };
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null, runShellCommandResult);

    autoDeployHelpers.printExternalIPs(initialContext, (error: string, externalContext: any) => {

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal(initialContext);
      sinon.assert.notCalled(runShellCommandStub);

      done();
    });
  });
});
