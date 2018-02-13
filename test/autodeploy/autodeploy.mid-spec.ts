import 'mocha';
import * as _ from 'lodash';
import { expect } from 'chai';
import * as async from 'async';
import * as sinon from 'sinon';
import { ChildProcess } from 'child_process';
import { ExecOutputReturnValue } from 'shelljs';
import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';
import * as autoDeploy from '../../deployment/gcp_scripts/autodeploy';

const { DEFAULT_ENVIRONMENTS } = require('../../deployment/gcp_scripts/default_deployment_config.json');

const ENVIRONMENT = 'test';
const PROJECT_NAME = 'my-cool-project3';
const PROJECT_ID = `${PROJECT_NAME}-${ENVIRONMENT}`;
const REGION = 'europe-west1';

const fixtures = [
  ..._.times(10, String),
  {
    code: 0,
    stderr: '',
    /* tslint:disable-next-line */
    stdout: `{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}`
  },
  ..._.times(2, String),
  {
    code: 0,
    stderr: '',
    /* tslint:disable-next-line */
    stdout: `{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}`
  },
  ..._.times(6, String),
  {
    code: 0,
    stderr: '',
    /* tslint:disable-next-line */
    stdout: `{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}`
  },
  ..._.times(7, String),
  { code: 0, stderr: '', stdout: `{"status": {"loadBalancer": {"ingress": [{"ip": "35.205.145.142"}]}}}` }
];

let allCommands = [];
let counter = 0;

describe('Autoimport Test: runShellCommand', () => {
  let runShellCommandStub;
  const allEnvs = Object.keys(DEFAULT_ENVIRONMENTS);
  allEnvs.push('stage', null);

  beforeEach(() => {
    runShellCommandStub = sinon.stub(commonHelpers, 'runShellCommand').callsFake(runShellCommandFn);
    counter = 0;
    allCommands = [];
  });

  afterEach(() => {
    runShellCommandStub.restore();
  });

  allEnvs.forEach((testEnv: string | null) => {
    it(`${testEnv} env: check not allowed values present in commands`, async () => {
      process.env.NODE_ENV = testEnv;

      const error = await autoDeploy.run();
      /* tslint:disable-next-line */
      expect(error).to.not.exist;

      const allUndefineds = allCommands.filter((command: string) => command.includes('undefined'));
      /* tslint:disable-next-line */
      expect(allUndefineds, `empty values present on command(s):\n* ${allUndefineds.join('\n* ')}`).to.be.an('array').that.is.empty;

      const allNulls = allCommands.filter((command: string) => command.includes('null'));
      /* tslint:disable-next-line */
      expect(allNulls, `empty values present on command(s):\n* ${allNulls.join('\n* ')}`).to.be.an('array').that.is.empty;

      const allEmptyValues = allCommands.filter((command: string) => command.match(/='\s'|="\s"|=\s|=''|=""/g));
      /* tslint:disable-next-line */
      expect(allEmptyValues, `empty values present on command(s):\n* ${allEmptyValues.join('\n* ')}`).to.be.an('array').that.is.empty;

    });
  });
});


function runShellCommandFn(command: string, options: any, cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess | string, string>): void {
  let outputParam = '';
  switch (true) {
    case _.includes(command, 'gcloud compute') && !_.includes(command, '--quiet'):
      outputParam = ' --format=json';
      break;
    case _.includes(command, 'gcloud beta billing') && !_.includes(command, '--quiet'):
      outputParam = ' --format=json';
      break;
    case _.includes(command, 'kubectl get service') && !_.includes(command, '--quiet'):
      outputParam = ' --output=json';
      break;
    default:
      break;
  }

  const wrappedCommand = `${command}${outputParam}`;
  allCommands.push(wrappedCommand);
  // console.log('Current fixture: ', fixtures[counter]);
  // console.log('RUN COMMAND: ', wrappedCommand, '\n');
  return async.setImmediate(() => cb(null, fixtures[counter++]));
}
