import { ChildProcess } from 'child_process';
import * as _ from 'lodash';
import * as shell from 'shelljs';
import * as async from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { DockerBuildArguments, GCloudArguments } from './interfaces';

let counter = 0;

interface AsyncResultCallback<T, E> { (err?: E, result?: T): void; }

export function runShellCommand(command: string, options: ExecOptions, cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess, string>): void {

  let outputParam = '';
  switch(true) {
    case _.includes(command, 'docker'):
    break;
    case _.includes(command, 'gcloud') && !_.includes(command, '--quiet'):
      outputParam = ' --format=json';
    break;
    case _.includes(command, 'kubectl get service') && !_.includes(command, '--quiet'):
      outputParam = ' --output=json';
    break;
    default:
    break;
  }

  const wrappedCommand = `${command}${outputParam}`;
  console.log('RUN COMMAND: ', wrappedCommand, '\n');

  // const ENVIRONMENT = 'test';
  // const PROJECT_NAME = 'my-cool-project3';
  // const PROJECT_ID = `${PROJECT_NAME}-${ENVIRONMENT}`;
  // const REGION = 'europe-west1';
  // const fixtures = [
  //   ..._.times(5, String),
  //   {code:0, stderr: '', stdout: `[{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}]`},
  //   ..._.times(1, String),
  //   {code:0, stderr: '', stdout: `[{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}]`},
  //   ..._.times(5, String),
  //   {code:0, stderr: '', stdout: `[{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}]`},
  //   ..._.times(7, String),
  //   {code:0, stderr: '', stdout: `{"status": {"loadBalancer": {"ingress": [{"ip": "35.205.145.142"}]}}}`}
  // ];
  // return async.setImmediate(() => cb(null, fixtures[counter++]));

//  const expectedConnectionError = /The\sconnection\sto\sthe\sserver\s(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\swas\srefused/;
  let attemptCounter = 0;

  async.retry({
    times: 10,
    interval: 10000
  }, (_cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess, string>) => {
    const result: ExecOutputReturnValue | ChildProcess = shell.exec(wrappedCommand, options);
    const error: string = shell.error();
    const code: number = (result as ExecOutputReturnValue).code;
    const stderr: string = (result as ExecOutputReturnValue).stderr;
    const stdout: string = (result as ExecOutputReturnValue).stdout;

    const isError404 = _.some(['AlreadyExists', 'The project ID you specified is already in use by another project', 'code=404', 'was not found', 'is not a valid name'], (item: string) => _.includes(stderr, item));

    if (error && !isError404) {
      console.log(`Attempt ${++attemptCounter} was failed..`);
      return async.setImmediate(() => _cb(`Unexpected error [code=${code}]: ${stderr}`, result));
    }

    if (isError404) {
      console.log(`SKIP STEP`);
      return async.setImmediate(() => _cb(null, result));
    }

    if (_.isEmpty(stdout)) {
      console.log(`STDOUT IS EMPTY`);
      return async.setImmediate(() => _cb(null, result));
    }

    if (_.includes(command, 'docker')) {
      console.log(`DOCKER COMMAND`);
      return async.setImmediate(() => _cb(null, result));
    }

    try {
      JSON.parse(stdout);

      return async.setImmediate(() => _cb(null, result));
    } catch (_error) {
      console.log(`Attempt ${++attemptCounter} was failed..`);

      return async.setImmediate(() => _cb('JSON parse syntax error. Retry to connect again..', result));
    }
  }, cb);
}

export function getDockerArguments(dockerArgs: DockerBuildArguments): string {
  return _.transform(dockerArgs, (result: string[], valueArg: string, nameArg: string) => {
    const wrapper = _.isString(valueArg) ? '"' : '';
    result.push(`--build-arg ${nameArg}=${wrapper}${valueArg}${wrapper}`);
  }, []).join(' ');
}

export function getGCloudArguments(gcloudArgs: any): string {
  return _.transform(gcloudArgs, (result: string[], valueArg: string | number | boolean, nameArg: string) => {
    // console.log('\n', nameArg, valueArg, _.isBoolean(valueArg), _.isNil(valueArg), '\n');
    if (_.isBoolean(valueArg) || _.isNil(valueArg)) {
      result.push(`--${_.kebabCase(nameArg)}`);
      return;
    }
    const wrapper = _.isString(valueArg) ? '"' : '';

    result.push(`--${_.kebabCase(nameArg)}=${wrapper}${valueArg}${wrapper}`);
  }, []).join(' ');
}

export function getContextInstance(externalContext: any, MACHINE_SUFFIX: string = 'WS'): GCloudArguments {
  const {
    PROJECT_ID,
    DEFAULT_IMAGE_NAME_SUFFIXES: _DEFAULT_IMAGE_NAME_SUFFIXES,
    DEFAULT_MACHINE_TYPES: _DEFAULT_MACHINE_TYPES,
    COMPUTED_VARIABLES: { NODE_ENV: _NODE_ENV, ENVIRONMENT: _ENVIRONMENT, VERSION: _VERSION, VERSION_TAG: _VERSION_TAG }
  } = externalContext;

  const DEFAULT_PORTS = externalContext[`DEFAULT_${MACHINE_SUFFIX}_PORTS`];
  const IMAGE_NAME_SUFFIX = _DEFAULT_IMAGE_NAME_SUFFIXES[MACHINE_SUFFIX];
  const IMAGE_NAME = `ws${_ENVIRONMENT}${IMAGE_NAME_SUFFIX}`;
  const IMAGE_URL = `gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${_VERSION_TAG}`;

  return {
    IMAGE_NAME,
    IMAGE_URL,
    TAG: _VERSION_TAG,
    PORT: DEFAULT_PORTS[_NODE_ENV],
    NODE_NAME: `${_ENVIRONMENT}-${IMAGE_NAME_SUFFIX}-${_VERSION}`,
    MACHINE_TYPE: _DEFAULT_MACHINE_TYPES[MACHINE_SUFFIX],
    MACHINE_SUFFIX
  };
}
