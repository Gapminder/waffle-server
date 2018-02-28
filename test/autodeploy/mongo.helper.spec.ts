import 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { expectNoEmptyParamsInCommand, hasFlag, withoutArg } from './testUtils';
import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';
import * as mongoHelpers from '../../deployment/gcp_scripts/mongo.helpers';
import * as _ from 'lodash';
import { pathToMongoSubnetwork, pathToMongoNetworkIP } from '../../deployment/gcp_scripts/mongo.helpers';

const sandbox = sinon.createSandbox();

describe('Mongo.helper Commands', () => {
  const networkIP = '192.127.0.2';
  const subnetwork = `https://www.googleapis.com/compute/beta/projects/TEST-Project/regions/TEST-region/subnetworks/default`;
  const commandStdoutFixture = Object.freeze({
    code: 0,
    stderr: '',
    stdout: JSON.stringify({
      status: {
        loadBalancer: { ingress: [{ ip: '35.205.145.142' }] }
      },
      networkInterfaces: [
        {
          accessConfigs: [{ natIP: '192.198.183.154' }],
          subnetwork,
          networkIP
        }
      ]
    })
  });
  const expectedContext = Object.freeze({
    PROJECT_ID: 'TEST_PROJECT_ID',
    MONGO_ZONE: 'TEST_MONGO_ZONE',
    MONGODB_PORT: 'MONGODB_PORT',
    MONGODB_PATH: 'MONGODB_PATH',
    MONGODB_SSH_KEY: 'MONGODB_SSH_KEY',
    MONGODB_USER_ROLE: 'MONGODB_USER_ROLE',
    MONGODB_USER: 'MONGODB_USER',
    MONGODB_PASSWORD: 'MONGODB_PASSWORD',
    MONGO_INSTANCE_NAME: 'MONGO_INSTANCE_NAME',
    MONGO_REGION: 'MONGO_REGION',
    MONGO_MACHINE_TYPE: 'MONGO_MACHINE_TYPE',
    MONGO_DISK_SIZE: 'MONGO_DISK_SIZE',
    COMPUTED_VARIABLES: {
      ENVIRONMENT: 'ENVIRONMENT',
      VERSION: 'TEST_VERSION',
      MONGODB_NAME: 'TEST_MONGODB_NAME'
    }
  });
  const expectedMongodbURL = `mongodb://${expectedContext.MONGODB_USER}:${
    expectedContext.MONGODB_PASSWORD
  }@${networkIP}:${expectedContext.MONGODB_PORT}/${expectedContext.COMPUTED_VARIABLES.MONGODB_NAME}`;

  afterEach(() => sandbox.restore());

  it('if no MONGODB_URL in context then create the mongo instance', (done: Function) => {
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, commandStdoutFixture);

    mongoHelpers.setupMongoInstance(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {
      sinon.assert.callCount(runShellCommandStub, 4);

      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand);
      expect(error).to.be.a('null');
      expect(externalContext).to.deep.equal({ ...expectedContext, MONGODB_URL: expectedMongodbURL });

      done();
    });
  });

  it('if MONGODB_URL already present in the context than skip setting Mongo instance and use existing', (done: Function) => {
    const expectedContextWithMongodbURL = Object.freeze({
      ...expectedContext,
      COMPUTED_VARIABLES: {
        MONGODB_URL: 'TEST_MONGODB_URL', // added this
        ENVIRONMENT: 'ENVIRONMENT',
        VERSION: 'TEST_VERSION',
        MONGODB_NAME: 'TEST_MONGODB_NAME'
      }
    });
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, { ...commandStdoutFixture });

    mongoHelpers.setupMongoInstance({ ...expectedContextWithMongodbURL }, (error: string, externalContext: any) => {
      sinon.assert.notCalled(runShellCommandStub);

      expect(error).to.be.a('null');
      expect(externalContext).to.deep.equal({ ...expectedContextWithMongodbURL, MONGODB_URL: 'TEST_MONGODB_URL' });

      done();
    });
  });

  it('if MONGODB_SSH_KEY is NOT present in the context then it should be skipped in mongoArgs', (done: Function) => {
    const { MONGODB_SSH_KEY, ...expectedContextWithoutSSH_KEY } = expectedContext;

    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, { ...commandStdoutFixture });

    mongoHelpers.setupMongoInstance({ ...expectedContextWithoutSSH_KEY }, (error: string, externalContext: any) => {
      sinon.assert.callCount(runShellCommandStub, 4);

      const args = runShellCommandStub.getCall(1).args[0];

      expect(args, 'has flag --metadata').to.match(/--metadata(\s|=)/);
      expect(args, 'has ssh-keys arg').not.to.include('ssh-keys');
      expect(error).to.be.a('null');
      expect(externalContext).to.deep.equal({ ...expectedContextWithoutSSH_KEY, MONGODB_URL: expectedMongodbURL });

      done();
    });
  });

  it('catch error from parse incorrect stdout', (done: Function) => {
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, { ...commandStdoutFixture, stdout: 'stdout' });

    mongoHelpers.setupMongoInstance({ ...expectedContext }, (error: string, externalContext: any) => {
      sinon.assert.callCount(runShellCommandStub, 3);

      expect(error).to.match(/Unexpected token . in JSON/);
      expect(externalContext).to.deep.equal({ ...expectedContext, MONGODB_URL: undefined });

      done();
    });
  });

  it('send path to check to runShellCommand', (done: Function) => {
    const expectedOptions = { pathsToCheck: [pathToMongoNetworkIP, pathToMongoSubnetwork] };
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, commandStdoutFixture);

      mongoHelpers.setupMongoInstance(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {
      sinon.assert.callCount(runShellCommandStub, 4);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand, expectedOptions);

      expect(error).to.be.a('null');
      expect(externalContext).to.deep.equal({ ...expectedContext, MONGODB_URL: expectedMongodbURL });

      done();
    });
  });
});
