import * as _ from 'lodash';
import * as async from 'async';
import { runShellCommand } from './common.helpers';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';


export function setupMongoInstance(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    PROJECT_ID,
    MONGODB_PORT,
    MONGODB_CONTAINER_IMAGE,
    MONGO_INSTANCE_NAME,
    MONGO_REGION,
    MONGO_MACHINE_TYPE,
    MONGO_DISK_SIZE,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION,
      MONGODB_NAME,
      MONGODB_URL
    }
  } = externalContext;

  if (!_.isEmpty(MONGODB_URL)) {
    return async.setImmediate(() => {
      console.log(`SKIP STEP with setuping MongoDB\n`);
      externalContext.MONGODB_URL = MONGODB_URL;

      return cb(null, externalContext);
    });
  }

  const context = {
    PROJECT_ID,
    MONGO_REGION,
    ENVIRONMENT,
    VERSION,
    MONGO_ZONE,
    MONGODB_PORT,
    MONGODB_NAME,
    MONGODB_CONTAINER_IMAGE,
    MONGO_INSTANCE_NAME,
    MONGO_MACHINE_TYPE,
    MONGO_DISK_SIZE,
    MONGO_HOST: null,
    MONGO_SUBNETWORK: null,
    MONGODB_URL
  };

  async.waterfall([
    async.constant(context),
    createMongo,
    getMongoInternalIP,
    reserveMongoInternalIP
  ], (error: string, result: any) => {
    externalContext.MONGODB_URL = result.MONGODB_URL;

    return cb(error, externalContext);
  });
}

function createMongo(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    PROJECT_ID,
    MONGODB_PORT,
    MONGODB_CONTAINER_IMAGE,
    MONGO_DISK_SIZE,
    MONGO_MACHINE_TYPE,
    MONGO_INSTANCE_NAME
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud beta compute instances create-with-container ${MONGO_INSTANCE_NAME} --boot-disk-size=${MONGO_DISK_SIZE} --machine-type=${MONGO_MACHINE_TYPE} --zone=${MONGO_ZONE} --container-image=${MONGODB_CONTAINER_IMAGE}`;
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