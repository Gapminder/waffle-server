import * as _ from 'lodash';
import * as async from 'async';
import { getGCloudArguments, getMongoArguments, runShellCommand } from './common.helpers';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { logger } from '../../ws.config/log';
import { pathToMongoNetworkIP, pathToMongoSubnetwork } from './autodeploy.helpers';

export function setupMongoInstance(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    PROJECT_ID,
    MONGO_REGION,
    MONGO_MACHINE_TYPE,
    MONGO_DISK_SIZE,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION,
      MONGODB_INSTANCE_NAME,
      MONGODB_URL
    }
  } = externalContext;

  const context = {
    PROJECT_ID,
    MONGO_REGION,
    ENVIRONMENT,
    VERSION,
    MONGO_ZONE,
    MONGODB_INSTANCE_NAME,
    MONGO_MACHINE_TYPE,
    MONGO_DISK_SIZE,
    MONGO_HOST: null,
    MONGO_SUBNETWORK: null,
    MONGODB_URL
  };

  async.waterfall([
    async.constant(context),
    getMongoInternalIP,
    createMongoFirewallRule,
    reserveMongoInternalIP
  ], (error: string, result: any) => {
    externalContext.MONGODB_URL = MONGODB_URL;

    return cb(error, externalContext);
  });
}

function createMongoFirewallRule(externalContext: any, cb: Function): void {
  const {
    ENVIRONMENT,
    VERSION
  } = externalContext;

  const command = `gcloud compute firewall-rules create ${ENVIRONMENT}-mongo-restrict-ssh-${VERSION} --direction=INGRESS --priority=1000 --network=default --action=ALLOW --rules=tcp:22 --target-tags=${ENVIRONMENT}-mongo-${VERSION}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    return cb(error, externalContext);
  });
}

function getMongoInternalIP(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    MONGODB_INSTANCE_NAME
  } = externalContext;

  const command = `gcloud compute instances describe ${MONGODB_INSTANCE_NAME} --zone=${MONGO_ZONE}`;
  const options: any = { pathsToCheck: [pathToMongoNetworkIP, pathToMongoSubnetwork] };

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {

    try {
      logger.info(result.stdout);

      const parsedStdout = JSON.parse(result.stdout);

      externalContext.MONGO_HOST = _.get(parsedStdout, pathToMongoNetworkIP, false);
      externalContext.MONGO_SUBNETWORK = _.get(parsedStdout, pathToMongoSubnetwork, false);

      logger.info(`MONGO INTERNAL IP: ${externalContext.MONGO_HOST}`);
      logger.info(`MONGO URL: ${externalContext.MONGODB_URL}, ${externalContext.MONGO_SUBNETWORK}`);
    } catch (_error) {
      return cb(_error, externalContext);
    }

    return cb(error, externalContext);
  });
}

function reserveMongoInternalIP(externalContext: any, cb: Function): void {
  const {
    MONGO_HOST,
    MONGO_SUBNETWORK,
    MONGO_REGION,
    ENVIRONMENT,
    VERSION
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-mongo-address-${VERSION}`;
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --region ${MONGO_REGION} --subnet ${MONGO_SUBNETWORK} --addresses ${MONGO_HOST}`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
