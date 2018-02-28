import * as _ from 'lodash';
import * as async from 'async';
import { getGCloudArguments, getMongoArguments, runShellCommand } from './common.helpers';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { logger } from '../../ws.config/log';
import { pathToTMNetworkIP } from './autodeploy.helpers';

export const pathToMongoNetworkIP = 'networkInterfaces.0.networkIP';
export const pathToMongoSubnetwork = 'networkInterfaces.0.subnetwork';

export function setupMongoInstance(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    PROJECT_ID,
    MONGODB_PORT,
    MONGODB_PATH,
    MONGODB_SSH_KEY,
    MONGODB_USER_ROLE,
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGO_INSTANCE_NAME,
    MONGO_REGION,
    MONGO_MACHINE_TYPE,
    MONGO_DISK_SIZE,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION,
      MONGODB_NAME,
      MONGODB_URL,
    }
  } = externalContext;

  const context = {
    PROJECT_ID,
    MONGO_REGION,
    ENVIRONMENT,
    VERSION,
    MONGO_ZONE,
    MONGODB_PORT,
    MONGODB_PATH,
    MONGODB_NAME,
    MONGODB_USER_ROLE,
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGODB_SSH_KEY,
    MONGO_INSTANCE_NAME,
    MONGO_MACHINE_TYPE,
    MONGO_DISK_SIZE,
    MONGO_HOST: null,
    MONGO_SUBNETWORK: null,
    MONGODB_URL
  };

  async.waterfall([
    async.constant(context),
    ... (_.isEmpty(MONGODB_URL) ? [createMongoFirewallRule, createMongo] : []),
    getMongoInternalIP,
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

function createMongo(externalContext: any, cb: Function): void {
  const {
    ENVIRONMENT,
    VERSION,
    MONGO_ZONE,
    PROJECT_ID,
    MONGODB_PORT,
    MONGODB_PATH,
    MONGODB_NAME,
    MONGODB_USER_ROLE,
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGODB_SSH_KEY,
    MONGO_DISK_SIZE,
    MONGO_MACHINE_TYPE,
    MONGO_INSTANCE_NAME
  } = externalContext;

  const mongoArgs = {
    MONGODB_USER_ROLE,
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGODB_NAME,
    MONGODB_PORT,
    MONGODB_PATH
  };

  if (MONGODB_SSH_KEY) {
    _.extend(mongoArgs, {SSH_KEYS: MONGODB_SSH_KEY});
  }

  const gcloudArgs = {
    PROJECT: PROJECT_ID,
    TAGS: `${ENVIRONMENT}-mongo-${VERSION}`,
    ZONE: MONGO_ZONE,
    MACHINE_TYPE: MONGO_MACHINE_TYPE,
    SUBNET: 'default',
    METADATA: getMongoArguments(mongoArgs),
    MAINTENANCE_POLICY: 'MIGRATE',
    SCOPES: '"https://www.googleapis.com/auth/devstorage.read_only","https://www.googleapis.com/auth/logging.write","https://www.googleapis.com/auth/monitoring.write","https://www.googleapis.com/auth/servicecontrol","https://www.googleapis.com/auth/service.management.readonly","https://www.googleapis.com/auth/trace.append"',
    MIN_CPU_PLATFORM: 'Automatic',
    IMAGE: 'ubuntu-1604-xenial-v20180126',
    IMAGE_PROJECT: 'ubuntu-os-cloud',
    NO_BOOT_DISK_AUTO_DELETE: null,
    DELETION_PROTECTION: null,
    BOOT_DISK_SIZE: MONGO_DISK_SIZE,
    BOOT_DISK_TYPE: 'pd-ssd'
  };
  const STARTUP_SCRIPT = './deployment/gcp_scripts/setup-mongo.sh';
  const commandArgs = getGCloudArguments(gcloudArgs);
  const command = `gcloud beta compute instances create ${MONGO_INSTANCE_NAME} --metadata-from-file startup-script=${STARTUP_SCRIPT} ${commandArgs}`;

  // --metadata-from-file startup-script=./deployment/gcp_scripts/setup-mongo.sh
  // const command = `gcloud compute instances add-metadata ${MONGO_INSTANCE_NAME} --tags mongodb --boot-disk-size=${MONGO_DISK_SIZE} --machine-type=${MONGO_MACHINE_TYPE} --zone=${MONGO_ZONE} --metadata mongo_user_role=readWrite,mongo_user=new-user,mongo_password=new-user-password,mongo_db=test-db --metadata-from-file startup-script=./deployment/gcp_scripts/setup-mongo.sh`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    return cb(error, externalContext);
  });
}

function getMongoInternalIP(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    MONGO_INSTANCE_NAME
  } = externalContext;

  const command = `gcloud compute instances describe ${MONGO_INSTANCE_NAME} --zone=${MONGO_ZONE}`;
  const options: any = { pathsToCheck: [pathToMongoNetworkIP, pathToMongoSubnetwork] };

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    
    try {
      logger.info('\n', result.stdout, '\n');
      
      const parsedStdout = JSON.parse(result.stdout);

      externalContext.MONGO_HOST = _.get(parsedStdout, pathToMongoNetworkIP, false);
      externalContext.MONGO_SUBNETWORK = _.get(parsedStdout, pathToMongoSubnetwork, false);
      // externalContext.MONGODB_URL = `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${externalContext.MONGO_HOST}:${MONGODB_PORT}/${MONGODB_NAME}`;
      // externalContext.MONGODB_URL = `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${externalContext.MONGO_HOST}:${MONGODB_PORT}/${MONGODB_NAME}`;

      logger.info('\nMONGO INTERNAL IP:', externalContext.MONGO_HOST, '\n');
      logger.info('\nMONGO URL:', externalContext.MONGODB_URL, ', ', externalContext.MONGO_SUBNETWORK, '\n');
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
