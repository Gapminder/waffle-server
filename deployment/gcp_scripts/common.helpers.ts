import * as _ from 'lodash';
import * as async from 'async';
import * as shell from 'shelljs';
import { ChildProcess } from 'child_process';
import { ExecOutputReturnValue } from 'shelljs';
import { DockerBuildArguments, GCloudArguments } from './interfaces';

interface AsyncResultCallback<T, E> { (err?: E, result?: T): void; }

const {
  DEFAULT_NODE_ENV,
} = require('./default_deployment_config.json');

export function runShellCommand(command: string, options: any, cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess | string, string>): void {

  // throw new Error('dssdfdsf');

  let outputParam = '';
  switch(true) {
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
  // console.log('Current fixture: ', fixtures[counter]);
  console.log('RUN COMMAND: ', wrappedCommand, '\n');

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

    const isErrorShouldBeSkipped = isStepShouldBeSkipped(stderr);
    const isResultShouldBeSkipped = isStepShouldBeSkipped(stdout);

    if (error && !isErrorShouldBeSkipped) {
      console.log(`Attempt ${++attemptCounter} was failed..`);
      return async.setImmediate(() => _cb(`Unexpected error [code=${code}]: ${stderr}`, result));
    }

    if (isErrorShouldBeSkipped || isResultShouldBeSkipped) {
      console.log(`SKIP STEP\n`);
      return async.setImmediate(() => _cb(null, result));
    }

    if (_.isEmpty(stdout)) {
      console.log(`STDOUT IS EMPTY\n`);
      return async.setImmediate(() => _cb(null, result));
    }

    if (_.includes(command, 'docker')) {
      console.log(`DOCKER COMMAND\n`);
      return async.setImmediate(() => _cb(null, result));
    }

    try {
      const parsedStdout = JSON.parse(stdout);

      if (options.pathToCheck && !_.get(parsedStdout, options.pathToCheck, false)) {
        throw new Error(`No required data by path '${options.pathToCheck}': ${parsedStdout}`);
      }

      return async.setImmediate(() => _cb(null, result));
    } catch (_error) {
      console.log(`Attempt ${++attemptCounter} was failed..`);

      return async.setImmediate(() => _cb('JSON parse syntax error. Retry to connect again..', result));
    }
  }, cb);
}

function isStepShouldBeSkipped(result: string): any {
  const skipMarkers = ['already exists', 'scaled', 'AlreadyExists', 'is already in use', 'code=404', 'was not found', 'is not a valid name'];

  return _.some(skipMarkers, (item: string) => {
    return _.includes(result, item);
  });
}

export function getDockerArguments(dockerArgs: DockerBuildArguments): string {
  return _.transform(dockerArgs, (result: string[], valueArg: string, nameArg: string) => {
    const wrapper = _.isString(valueArg) || _.isArray(valueArg) ? '"' : '';
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

export function getMongoArguments(mongoArgs: Dictionary<string>): string {
  return _.transform(mongoArgs, (result: string[], valueArg: string, nameArg: string) => {
    result.push(`${_.kebabCase(nameArg)}=${valueArg}`);
  }, []).join(',');
}

export function getContextInstance(externalContext: any, MACHINE_SUFFIX: string = 'WS'): GCloudArguments {
  const {
    PROJECT_ID,
    DEFAULT_IMAGE_NAME_SUFFIXES,
    DEFAULT_MACHINE_TYPES,
    COMPUTED_VARIABLES: { NODE_ENV, ENVIRONMENT, VERSION, VERSION_TAG, [`${MACHINE_SUFFIX}_PORT`]: PORT }
  } = externalContext;

  const DEFAULT_PORTS = externalContext[`DEFAULT_${MACHINE_SUFFIX}_PORTS`];
  const IMAGE_NAME_SUFFIX = DEFAULT_IMAGE_NAME_SUFFIXES[MACHINE_SUFFIX];
  const IMAGE_NAME = `ws${ENVIRONMENT}${IMAGE_NAME_SUFFIX}`;
  const IMAGE_URL = `gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${VERSION_TAG}`;

  return {
    IMAGE_NAME,
    IMAGE_URL,
    TAG: VERSION_TAG,
    PORT: PORT || DEFAULT_PORTS[NODE_ENV],
    NODE_NAME: `${ENVIRONMENT}-${IMAGE_NAME_SUFFIX}-${VERSION}`,
    MACHINE_SUFFIX
  };
}
