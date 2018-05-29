import 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { expectNoEmptyParamsInCommand } from './testUtils';
import * as commonHelpers from '../../deployment/common.helpers';
import * as redisHelpers from '../../deployment/redis.helpers';
import * as _ from 'lodash';
import { pathToRedisSubnetwork, pathToRedisNetworkIP } from '../../deployment/redis.helpers';
import { loggerFactory } from '../../ws.config/log';

const sandbox = sinon.createSandbox();

describe('Redis.helper Commands', () => {
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
    REDIS_CONTAINER_IMAGE: 'TEST_REDIS_CONTAINER_IMAGE',
    REDIS_INSTANCE_NAME: 'TEST_REDIS_INSTANCE_NAME',
    REDIS_MACHINE_TYPE: 'TEST_REDIS_MACHINE_TYPE',
    REDIS_DISK_SIZE: 320,
    REDIS_ZONE: 'TEST_REDIS_ZONE',
    REDIS_REGION: 'TEST_REDIS_REGION',
    COMPUTED_VARIABLES: Object.freeze({
      ENVIRONMENT: 'ENVIRONMENT',
      VERSION: 'TEST_VERSION'
    })
  });

  let loggerStub;

  beforeEach(() => {
    loggerStub = {info: sandbox.stub(), error: sandbox.stub, warn: sandbox.stub()};
    sandbox.stub(loggerFactory, 'getLogger').returns(loggerStub);
  });

  afterEach(() => sandbox.restore());

  it('setupReisInstance: happy path', (done: Function) => {
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, { ...commandStdoutFixture });

    redisHelpers.setupRedisInstance(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {
      sinon.assert.calledThrice(runShellCommandStub);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand);
      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal({
        ...expectedContext,
        REDIS_HOST: networkIP,
        REDIS_SUBNETWORK: subnetwork
      });

      done();
    });
  });

  it('catch error from incorrect JSON in stdout', (done: Function) => {
    const runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null, {
      ...commandStdoutFixture,
      stdout: 'stdout'
    });

    redisHelpers.setupRedisInstance(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {
      sinon.assert.calledTwice(runShellCommandStub);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand);
      expect(error).to.match(/Unexpected token . in JSON/);
      expect(externalContext).to.deep.equal({
        ...expectedContext,
        REDIS_HOST: null,
        REDIS_SUBNETWORK: null
      });

      done();
    });
  });

  it('send path to check to runShellCommand', (done: Function) => {
    const expectedOptions = { pathsToCheck: [pathToRedisNetworkIP, pathToRedisSubnetwork] };
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, { ...commandStdoutFixture });

    redisHelpers.setupRedisInstance(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {
      sinon.assert.calledThrice(runShellCommandStub);
      sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand, expectedOptions);

      expect(error).to.be.an('null');
      expect(externalContext).to.deep.equal({
        ...expectedContext,
        REDIS_HOST: networkIP,
        REDIS_SUBNETWORK: subnetwork
      });

      done();
    });
  });
});
