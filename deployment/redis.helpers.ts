import * as _ from 'lodash';
import * as async from 'async';
import { runShellCommand } from './common.helpers';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { logger } from '../ws.config/log';

export const pathToRedisNetworkIP = 'networkInterfaces.0.networkIP';
export const pathToRedisSubnetwork = 'networkInterfaces.0.subnetwork';

export function setupRedisInstance(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_CONTAINER_IMAGE,
    REDIS_INSTANCE_NAME,
    REDIS_MACHINE_TYPE,
    REDIS_DISK_SIZE,
    REDIS_ZONE,
    REDIS_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const context = {
    PROJECT_ID,
    REDIS_CONTAINER_IMAGE,
    REDIS_INSTANCE_NAME,
    REDIS_MACHINE_TYPE,
    REDIS_DISK_SIZE,
    REDIS_ZONE,
    REDIS_REGION,
    ENVIRONMENT,
    VERSION,
    REDIS_HOST: null,
    REDIS_SUBNETWORK: null
  };

  async.waterfall([
    async.constant(context),
    createRedis,
    getRedisInternalIP,
    reserveRedisInternalIP
  ], (error: string, _context: any) => {
    externalContext.REDIS_HOST = _context.REDIS_HOST;
    externalContext.REDIS_SUBNETWORK = _context.REDIS_SUBNETWORK;

    return cb(error, externalContext);
  });
}

function createRedis(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_CONTAINER_IMAGE,
    REDIS_INSTANCE_NAME,
    REDIS_MACHINE_TYPE,
    REDIS_DISK_SIZE,
    REDIS_ZONE
  } = externalContext;

  const command = `gcloud beta compute instances create-with-container ${REDIS_INSTANCE_NAME} 
    --machine-type=${REDIS_MACHINE_TYPE} --boot-disk-size=${REDIS_DISK_SIZE} 
    --zone=${REDIS_ZONE} --container-image=${REDIS_CONTAINER_IMAGE}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

function getRedisInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_CONTAINER_IMAGE,
    REDIS_INSTANCE_NAME,
    REDIS_ZONE
  } = externalContext;

  const command = `gcloud compute instances describe ${REDIS_INSTANCE_NAME} --zone=${REDIS_ZONE}`;
  const options: any = { pathsToCheck: [pathToRedisNetworkIP, pathToRedisSubnetwork] };

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {

    try {
      logger.info(result.stdout);
      const { networkInterfaces: [{ networkIP, subnetwork }] } = JSON.parse(result.stdout);
      logger.info(`REDIS INTERNAL IP: ${networkIP}, ${subnetwork}`);
      externalContext.REDIS_HOST = networkIP;
      externalContext.REDIS_SUBNETWORK = subnetwork;
    } catch (_error) {
      return cb(_error, externalContext);
    }

    return cb(error, externalContext);
  });
}

function reserveRedisInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_HOST,
    REDIS_SUBNETWORK,
    REDIS_REGION,
    ENVIRONMENT,
    VERSION
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-redis-address-${VERSION}`;
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --region=${REDIS_REGION} --subnet ${REDIS_SUBNETWORK} --addresses ${REDIS_HOST}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
