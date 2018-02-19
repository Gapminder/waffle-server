import * as _ from 'lodash';
import * as async from 'async';
import { getGCloudArguments, getMongoArguments, runShellCommand } from './common.helpers';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';


export function setupMongoInstance(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    PROJECT_ID,
    MONGODB_PORT,
    MONGODB_CONTAINER_IMAGE,
    MONGODB_SSH_KEY,
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
    MONGODB_NAME,
    MONGODB_CONTAINER_IMAGE,
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
    createMongoFirewallRule,
    createMongo,
    ... (_.isEmpty(MONGODB_URL) ? [getMongoInternalIP, reserveMongoInternalIP] : [])
  ], (error: string, result: any) => {
    externalContext.MONGODB_URL = result.MONGODB_URL;

    return cb(error, externalContext);
  });
}

function createMongoFirewallRule(externalContext: any, cb: Function): void {
  const {
    ENVIRONMENT
  } = externalContext;

  const command = `gcloud compute firewall-rules create ${ENVIRONMENT}-mongo-restrict --direction=INGRESS --priority=1000 --network=default --action=ALLOW --rules=tcp:22 --target-tags=${ENVIRONMENT}-mongo`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    return cb(error, externalContext);
  });
}

function createMongo(externalContext: any, cb: Function): void {
  const {
    ENVIRONMENT,
    MONGO_ZONE,
    PROJECT_ID,
    // MONGODB_PORT,
    MONGODB_NAME,
    MONGODB_CONTAINER_IMAGE,
    MONGODB_SSH_KEY,
    MONGO_DISK_SIZE,
    MONGO_MACHINE_TYPE,
    MONGO_INSTANCE_NAME
  } = externalContext;

  const mongoArgs = {
    MONGO_USER_ROLE: 'readWrite',
    MONGO_USER: 'new-user',
    MONGO_PASSWORD: 'new-user-password',
    MONGO_DB: MONGODB_NAME,
    // MONGO_PORT: MONGODB_PORT
  };

  if (MONGODB_SSH_KEY) {
    _.extend(mongoArgs, {SSH_KEYS: MONGODB_SSH_KEY});
  }

  const gcloudArgs = {
    PROJECT: PROJECT_ID,
    TAGS: `${ENVIRONMENT}-mongo`,
    ZONE: MONGO_ZONE,
    MACHINE_TYPE: MONGO_MACHINE_TYPE,
    SUBNET: 'default',
    METADATA: `^#&&#^${getMongoArguments(mongoArgs)}`,
    MAINTENANCE_POLICY: 'MIGRATE',
    SCOPES: '"https://www.googleapis.com/auth/devstorage.read_only","https://www.googleapis.com/auth/logging.write","https://www.googleapis.com/auth/monitoring.write","https://www.googleapis.com/auth/servicecontrol","https://www.googleapis.com/auth/service.management.readonly","https://www.googleapis.com/auth/trace.append"',
    MIN_CPU_PLATFORM: 'Automatic',
    IMAGE: 'ubuntu-1604-xenial-v20180126',
    IMAGE_PROJECT: 'ubuntu-os-cloud',
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
    PROJECT_ID,
    MONGODB_PORT,
    MONGODB_NAME,
    MONGODB_URL,
    MONGODB_CONTAINER_IMAGE,
    MONGO_INSTANCE_NAME
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud compute instances describe ${MONGO_INSTANCE_NAME} --zone=${MONGO_ZONE}`;
  const options: any = {pathToCheck: 'networkInterfaces.0.networkIP'};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    console.log('\n', result.stdout, '\n');
    console.log(`\nConfig has mongourl: ${MONGODB_URL}\n`);

    try {
      const { networkInterfaces: [{ networkIP, subnetwork }] } = JSON.parse(result.stdout);
      externalContext.MONGO_HOST = networkIP;
      externalContext.MONGO_SUBNETWORK = subnetwork;
      externalContext.MONGODB_URL = MONGODB_URL || `mongodb://${externalContext.MONGO_HOST}:${MONGODB_PORT}/${MONGODB_NAME}`;

      console.log('\nMONGO INTERNAL IP:', externalContext.MONGO_HOST, '\n');
      console.log('\nMONGO URL:', externalContext.MONGODB_URL, ', ', externalContext.MONGO_SUBNETWORK, '\n');
    } catch (_error) {
      return cb(_error, externalContext);
    }

    return cb(error, externalContext);
  });
}

function reserveMongoInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    MONGO_HOST,
    MONGO_SUBNETWORK,
    MONGO_REGION,
    ENVIRONMENT,
    VERSION
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-mongo-address-${VERSION}`;
  //fixme: REGION, --project=${PROJECT_ID}
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --region ${MONGO_REGION} --subnet ${MONGO_SUBNETWORK} --addresses ${MONGO_HOST}`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
