import 'mocha';
import * as _ from 'lodash';
import * as async from 'async';
import {AsyncResultCallback} from 'async';
import * as sinon from 'sinon';
import {ChildProcess} from 'child_process';
import {ExecOutputReturnValue} from 'shelljs';
import * as path from 'path';

import { DEFAULT_CONFIG } from '../../deployment/deployment_config.default';

import * as commonHelpers from '../../deployment/common.helpers';
import * as autoDeploy from '../../deployment/autodeploy';

const chai = require('chai');
chai.use(require('./testUtils/chaiJsMatchers'));
const expect = chai.expect;

const {DEFAULT_ENVIRONMENTS, DEFAULT_NODE_ENV} = DEFAULT_CONFIG;

const sandbox = sinon.createSandbox();

// Example: TEST_ENVIRONMENTS=local npm run integration
// Example: TEST_ENVIRONMENTS=local,development npm run integration
// Example: npm run integration
const TEST_ENVIRONMENTS = process.env.TEST_ENVIRONMENTS ? process.env.TEST_ENVIRONMENTS.split(',') : [];

let allCommands = [];

describe('Autoimport Test: runShellCommand', () => {
  let runShellCommandStub;
  const DEFAULT_PATH_TO_CONFIG_FILE = path.resolve('./test/autodeploy/fixtures/deployment_config_');

  // Get list of all reserved environments (development,local,prod,test)
  // concat with default environment (development) and stage (or any other name)
  // filter all environments what we want to check, or check all environments by default
  const allEnvs = _.chain(DEFAULT_ENVIRONMENTS)
    .keys()
    .concat([null, 'stage'])
    .filter((env: string) => _.isEmpty(TEST_ENVIRONMENTS) ? true : _.includes(TEST_ENVIRONMENTS, env))
    .value();

  beforeEach(() => {
    runShellCommandStub = sandbox.stub(commonHelpers, 'runShellCommand').callsFake(runShellCommandFn);
    allCommands = [];
  });

  afterEach(() => {
    sandbox.restore();
  });

  allEnvs.forEach((testEnv: string | null) => {
    // if it is step for testEnv === null, then name of the test should be reflected in test name
    const testName = _.isNil(testEnv) ? 'default' : testEnv;
    it(`*** ${testName.toUpperCase()} env: check not allowed values present in commands`, async () => {
      sandbox.stub(DEFAULT_CONFIG, 'DEFAULT_PATH_TO_CONFIG_FILE').value(DEFAULT_PATH_TO_CONFIG_FILE);

      if (process.env.NODE_ENV) {
        delete process.env.NODE_ENV;
      }

      if (testEnv) {
        process.env.NODE_ENV = testEnv;
      }

      const error = await autoDeploy.run();
      /* tslint:disable-next-line */
      expect(error).to.not.exist;

      const allCommandsWithEnv = getAllCommandsWhichShouldBeWithEnvironment(allCommands);

      // Notice: Don't move this block, because testEnv should be set as process.env.NODE_ENV according to the stored value in allEnvs
      // If testEnv is null, then it should be set as DEFAULT_NODE_ENV from default config
      testEnv = _.isNil(testEnv) ? DEFAULT_NODE_ENV : testEnv;
      // If testEnv isn't included in the list of default environments, then use it as is
      const actualTestEnv = DEFAULT_ENVIRONMENTS[testEnv] || testEnv;

      allCommandsWithEnv.forEach((command: string) => {
        return expect(command, `wrong ENVIRONMENT in command:\n* ${command}`).to.contain(actualTestEnv);
      });

      /* tslint:disable-next-line */
      expect(allCommands).not.to.have.undefinedNullOrEmptyValues;
    });

  });
});

const ENVIRONMENT = 'test';
const PROJECT_NAME = 'my-cool-project3';
const PROJECT_ID = `${PROJECT_NAME}-${ENVIRONMENT}`;
const REGION = 'europe-west1';

function getAllCommandsWhichShouldBeWithEnvironment(_allCommands: string[]): string[] {
  return _.reject(_allCommands, (command: string) => command.match(/config|services/gi));
}

// TODO use 'times' not super cool because mongo setup step could be skipped and then total number of steps will be decreased
// but anyway this is just strings to imitate output
// so let's completely stub it for now
// note that the last output with loadBalancer info is actually printerd only in 'local' env because we setup mongo for this env
const commandStdoutFixture = {
  code: 0,
  stderr: '',
  stdout: JSON.stringify({
    status: {
      loadBalancer: {ingress: [{ip: '35.205.145.142'}]}
    },
    networkInterfaces: [{
      accessConfigs: [{natIP: '35.205.183.154'}],
      subnetwork: `https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default`,
      networkIP: '192.127.0.2'
    }]
  })
};

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
  console.log('RUN COMMAND: ', wrappedCommand, '\n');
  return async.setImmediate(() => cb(null, commandStdoutFixture));
}
