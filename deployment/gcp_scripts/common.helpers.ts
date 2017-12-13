import { ChildProcess } from 'child_process';
import * as _ from 'lodash';
import * as shell from 'shelljs';
import * as async from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { DockerBuildArguments, GCloudArguments } from './interfaces';

export function runShellCommand(command: string, options: ExecOptions, cb: Function): void {
  console.log('RUN COMMAND: ', command, '\n');

  // const ENVIRONMENT = 'prod';
  // const PROJECT_ID = `${ENVIRONMENT}-waffle-server`;
  // const REGION = 'europe-west1';
  // return async.setImmediate(() => cb(null, {code:0, stderr: '', stdout: `[{"networkInterfaces":[{"accessConfigs":[{"natIP":"35.205.183.154"}],"subnetwork":"https://www.googleapis.com/compute/beta/projects/${PROJECT_ID}/regions/${REGION}/subnetworks/default","networkIP":"192.127.0.2"}]}]`}));

  const result: ExecOutputReturnValue | ChildProcess = shell.exec(command, options);
  const error: string = shell.error();

  if (error) {
    return cb(`Unexpected error [code=${(result as ExecOutputReturnValue).code}]: ${result.stderr}`, result);
  }

  return cb(null, result);
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
