import 'mocha';
import * as _ from 'lodash';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as commonHelpers from '../../deployment/common.helpers';
import * as autoRemoveHelpers from '../../deployment/autoremove.helpers';
import { expectNoEmptyParamsInCommand } from './testUtils';

const sandbox = sinon.createSandbox();

describe('Autoremove.helper Commands', () => {
  let runShellCommandStub;

  beforeEach(() => {
    runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsArgWithAsync(2, null);
  });

  afterEach(() => sandbox.restore());

  const commands = Object.keys(autoRemoveHelpers);

  commands.forEach((command: string) => {
    it(`${command} not modified context`, (done: Function) => {
      const expectedContext = Object.freeze({
        PROJECT_ID: 'TEST_PROJECT_ID',
        PROJECT_NAME: 'TEST_PROJECT_NAME',
        PROJECT_LABELS: 'TEST_PROJECT_NAME',
        REDIS_INSTANCE_NAME: 'TEST_REDIS_INSTANCE_NAME',
        REDIS_ZONE: 'TEST_REDIS_ZONE',
        REDIS_REGION: 'TEST_REDIS_REGION',
        MONGO_ZONE: 'TEST_MONGO_ZONE',
        MONGO_REGION: 'TEST_MONGO_REGION',
        FOLDER_ID: 'TEST_FOLDER_ID',
        FIREWALL_RULE__ALLOW_HTTP: 'TEST_FIREWALL',
        CLUSTER_NAME: 'TEST_CLUSTER_NAME',
        LB_ZONE: 'TEST_LB_ZONE',
        TM_INSTANCE_VARIABLES: {
          IMAGE_URL: 'TEST_IMAGE_URL',
          NODE_NAME: 'TEST_NODE_NAME'
        },
        TM_ZONE: 'TEST_TM_ZONE',
        TM_REGION: 'TM_REGION',
        NODE_INSTANCE_VARIABLES: {
          IMAGE_URL: 'TEST_IMAGE_URL'
        },
        COMPUTED_VARIABLES: {
          ENVIRONMENT: 'TEST_ENVIRONMENT',
          VERSION: 'TEST_VERSION',
          MONGODB_INSTANCE_NAME: 'TEST_MONGO_INSTANCE_NAME',
        }
      });

      autoRemoveHelpers[command](expectedContext, (error: string, externalContext: any) => {
        sinon.assert.calledWith(runShellCommandStub, expectNoEmptyParamsInCommand, {});
        expect(error).to.be.an('null');
        expect(externalContext).to.deep.equal(expectedContext);

        done();
      });
    });
  });
});
