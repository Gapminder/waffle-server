import 'mocha';
import { expect } from 'chai';
import * as _ from 'lodash';
import * as async from 'async';
import { ExecOutputReturnValue } from 'shelljs';
import { ChildProcess } from 'child_process';
import * as sinon from 'sinon';
import * as autodeploy from '../../deployment/gcp_scripts/autodeploy';

import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';
import { runShellCommand } from '../../deployment/gcp_scripts/common.helpers';

const ENVIRONMENT = 'test';
const PROJECT_NAME = 'my-cool-project3';
const PROJECT_ID = `${PROJECT_NAME}-${ENVIRONMENT}`;
const REGION = 'europe-west1';

const fixtures = [
  ..._.times(10, String),
  {
    code: 0,
    stderr: '',
    stdout: `{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}`
  },
  ..._.times(2, String),
  {
    code: 0,
    stderr: '',
    stdout: `{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}`
  },
  ..._.times(6, String),
  {
    code: 0,
    stderr: '',
    stdout: `{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}`
  },
  ..._.times(7, String),
  { code: 0, stderr: '', stdout: `{"status": {"loadBalancer": {"ingress": [{"ip": "35.205.145.142"}]}}}` }
];

let allCommands = [];
let counter = 0;

describe.only('Autoimport Test: runShellCommand', () => {
  let runShellCommandStub;
  const env = ['development', 'local', 'test', 'production', 'stage', 'dev'];

  beforeEach(() => {
    runShellCommandStub = sinon.stub(commonHelpers, 'runShellCommand').callsFake(runShellCommandFn);
    counter = 0;
    allCommands = [];
  });
  afterEach(() => {
    runShellCommandStub.restore();
  });

  env.forEach((testEnv: string) => {
    it(`${testEnv} env: undefined`, async () => {
      process.env.NODE_ENV = testEnv;

      const error = await autodeploy.run();
      expect(error).to.not.exist;

      const result = allCommands.filter((command: string) => command.includes('undefined'));
      expect(result, result.join('\n')).to.be.an('array').that.is.empty;
    });

    it(`${testEnv} env: null`, async () => {
      process.env.NODE_ENV = testEnv;

      const error = await autodeploy.run();
      expect(error).to.not.exist;

      const result = allCommands.filter((command: string) => command.includes('null'));
      expect(result, result.join('\n')).to.be.an('array').that.is.empty;
    });

    it(`${testEnv} env: empty values`, async () => {
      process.env.NODE_ENV = testEnv;

      const error = await autodeploy.run();
      expect(error).to.not.exist;

      const result = allCommands.filter((command: string) => command.match(/='\s'|="\s"|=\s|=''|=""/g));
      expect(result, result.join('\n')).to.be.an('array').that.is.empty;
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
