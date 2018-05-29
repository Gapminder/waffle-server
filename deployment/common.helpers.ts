import * as _ from 'lodash';
import * as async from 'async';
import * as shell from 'shelljs';
import { ChildProcess } from 'child_process';
import { ExecOutputReturnValue } from 'shelljs';
import { DockerBuildArguments, GCloudArguments } from './interfaces';
import { loggerFactory } from '../ws.config/log';
import { constants } from '../ws.utils/constants';

interface AsyncResultCallback<T, E> { (err?: E, result?: T): void; }
const GCP_STACK_ACTION = process.env.GCP_STACK_ACTION;

const {
  DEFAULT_NODE_ENV
} = require('./deployment_config.default');

export function runShellCommand(command: string, options: any, cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess | string, string>): void {

  // throw new Error('dssdfdsf');

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
  const logger = loggerFactory.getLogger(GCP_STACK_ACTION);
  logger.info('RUN COMMAND: ', wrappedCommand, '\n');

  let attemptCounter = 0;

  async.retry({
    times: constants.AUTODEPLOY_RETRY_TIMES,
    interval: constants.AUTODEPLOY_RETRY_INTERVAL
  }, (_cb: AsyncResultCallback<ExecOutputReturnValue | ChildProcess, string>) => {
    const result: ExecOutputReturnValue | ChildProcess = shell.exec(wrappedCommand, options);
    const error: string = shell.error();
    const code: number = (result as ExecOutputReturnValue).code;
    const stderr: string = (result as ExecOutputReturnValue).stderr;
    const stdout: string = (result as ExecOutputReturnValue).stdout;

    const isErrorShouldBeSkipped = isStepShouldBeSkipped(stderr);
    const isResultShouldBeSkipped = isStepShouldBeSkipped(stdout);

    if (error && !isErrorShouldBeSkipped) {
      logger.info(`Attempt ${++attemptCounter} was failed..`);
      return async.setImmediate(() => _cb(`Unexpected error [code=${code}]: ${stderr}`, result));
    }

    if (isErrorShouldBeSkipped || isResultShouldBeSkipped) {
      logger.info(`SKIP STEP`);
      return async.setImmediate(() => _cb(null, result));
    }

    if (_.isEmpty(stdout)) {
      logger.info(`STDOUT IS EMPTY`);
      return async.setImmediate(() => _cb(null, result));
    }

    if (_.includes(command, 'docker')) {
      logger.info(`DOCKER COMMAND`);
      return async.setImmediate(() => _cb(null, result));
    }

    try {
      const parsedStdout = JSON.parse(stdout);

      if (options.pathsToCheck) {
        const missingPaths = options.pathsToCheck.filter((path: string) => !_.get(parsedStdout, path, false));

        if (missingPaths.length) {
          return async.setImmediate(() => _cb(`No required data by paths: "${missingPaths.join('", "')}" : ${stdout}`, result));
        }
      }

      return async.setImmediate(() => _cb(null, result));
    } catch (_error) {
      logger.info(`Attempt ${++attemptCounter} was failed..`);

      return async.setImmediate(() => _cb(`JSON parse syntax error: ${_error.message}. Retry to connect again..`, result));
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
