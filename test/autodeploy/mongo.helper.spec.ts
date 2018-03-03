import 'mocha';
import {expect} from 'chai';
import * as sinon from 'sinon';
import {expectNoEmptyParamsInCommand, hasFlag, withoutArg} from './testUtils';
import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';
import * as mongoHelpers from '../../deployment/gcp_scripts/mongo.helpers';
import * as _ from 'lodash';
import { pathToMongoNetworkIP, pathToMongoSubnetwork } from '../../deployment/gcp_scripts/autodeploy.helpers';

const sandbox = sinon.createSandbox();

describe('Mongo.helper Commands', () => {
  const networkIP = '192.127.0.2';
  const subnetwork = `https://www.googleapis.com/compute/beta/projects/TEST-Project/regions/TEST-region/subnetworks/default`;
  const commandStdoutFixture = Object.freeze({
    code: 0,
    stderr: '',
    stdout: JSON.stringify({
      status: {
        loadBalancer: {ingress: [{ip: '35.205.145.142'}]}
      },
      networkInterfaces: [
        {
          accessConfigs: [{natIP: '192.198.183.154'}],
          subnetwork,
          networkIP
        }
      ]
    })
  });
  const expectedContext = Object.freeze({
    PROJECT_ID: 'TEST_PROJECT_ID',
    MONGO_ZONE: 'TEST_MONGODB_ZONE',
    MONGO_REGION: 'MONGODB_REGION',
    MONGO_MACHINE_TYPE: 'MONGODB_MACHINE_TYPE',
    MONGO_DISK_SIZE: 'MONGODB_DISK_SIZE',
    COMPUTED_VARIABLES: Object.freeze({
      ENVIRONMENT: 'ENVIRONMENT',
      VERSION: 'TEST_VERSION',
      MONGODB_URL: 'TEST_MONGODB_URL'
    })
  });

  afterEach(() => sandbox.restore());

  it('if MONGODB_URL already present in the context than skip setting Mongo instance and use existing', (done: Function) => {
    const expectedContextWithMongodbURL = Object.freeze({
      ...expectedContext,
      COMPUTED_VARIABLES: Object.freeze({
        MONGODB_URL: 'TEST_MONGODB_URL', // added this
        MONGODB_INSTANCE_NAME: 'TEST_MONGODB_INSTANCE_NAME',
        ENVIRONMENT: 'ENVIRONMENT',
        VERSION: 'TEST_VERSION'
      })
    });
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, {...commandStdoutFixture});

    mongoHelpers.setupMongoInstance(_.cloneDeep(expectedContextWithMongodbURL), (error: string, externalContext: any) => {
      sinon.assert.callCount(runShellCommandStub, 3);
      sinon.assert.calledWith(runShellCommandStub,
        `gcloud compute instances describe TEST_MONGODB_INSTANCE_NAME --zone=TEST_MONGODB_ZONE`, {
          pathsToCheck: ['networkInterfaces.0.networkIP', 'networkInterfaces.0.subnetwork']
        }, sinon.match.func);
      sinon.assert.calledWith(runShellCommandStub,
        `gcloud compute firewall-rules create ENVIRONMENT-mongo-restrict-ssh-TEST_VERSION --direction=INGRESS --priority=1000 --network=default --action=ALLOW --rules=tcp:22 --target-tags=ENVIRONMENT-mongo-TEST_VERSION`,
        {  },
        sinon.match.func
      );
      sinon.assert.calledWith(runShellCommandStub,
        `gcloud compute addresses create ENVIRONMENT-mongo-address-TEST_VERSION --region MONGODB_REGION --subnet https://www.googleapis.com/compute/beta/projects/TEST-Project/regions/TEST-region/subnetworks/default --addresses 192.127.0.2`,
        {  },
        sinon.match.func
      );

      expect(error).to.be.a('null');
      expect(externalContext).to.deep.equal({...expectedContextWithMongodbURL, MONGODB_URL: 'TEST_MONGODB_URL'});

      done();
    });
  });

  it('catch error from parse incorrect stdout', (done: Function) => {
    const runShellCommandStub = sandbox
      .stub(commonHelpers, 'runShellCommand')
      .callsArgWithAsync(2, null, {...commandStdoutFixture, stdout: 'stdout'});

    mongoHelpers.setupMongoInstance(_.cloneDeep(expectedContext), (error: string, externalContext: any) => {
      sinon.assert.callCount(runShellCommandStub, 1);

      expect(error).to.match(/Unexpected token . in JSON/);
      expect(externalContext).to.deep.equal(_.assign({
        MONGODB_URL: expectedContext.COMPUTED_VARIABLES.MONGODB_URL
      }, expectedContext));

      done();
    });
  });
});
