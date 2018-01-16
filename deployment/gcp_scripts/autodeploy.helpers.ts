import * as _ from 'lodash';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import * as async from 'async';

import { getDockerArguments, getGCloudArguments, runShellCommand } from './common.helpers';
import { DockerBuildArguments, DockerBuildArgumentsTM } from './interfaces';

export function setDefaultUser(externalContext: any, cb: Function): void {
  const {
    COMPUTED_VARIABLES: { OWNER_ACCOUNT }
  } = externalContext;

  const command = `gcloud config set account ${OWNER_ACCOUNT}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setDefaultProject(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID
  } = externalContext;

  const command = `gcloud config set project ${PROJECT_ID}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function linkProjectToBilling(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    COMPUTED_VARIABLES: { BILLING_ACCOUNT }
  } = externalContext;

  const command = `gcloud beta billing projects link ${PROJECT_ID} --billing-account=${BILLING_ACCOUNT}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function enableCloudBillingAPI(externalContext: any, cb: Function): void {
  const {
  } = externalContext;

  const command = `gcloud beta services enable cloudbilling.googleapis.com`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function enableComputeService(externalContext: any, cb: Function): void {
  const {
  } = externalContext;

  const command = `gcloud beta services enable compute.googleapis.com`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function enableContainerRegistryAPI(externalContext: any, cb: Function): void {
  const {
  } = externalContext;

  const command = `gcloud beta services enable containerregistry.googleapis.com`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function enableStackdriverLoggingAPI(externalContext: any, cb: Function): void {
  const {
  } = externalContext;

  const command = `gcloud beta services enable logging.googleapis.com`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createCridentials(externalContext: any, cb: Function): void {
  const {
    COMPUTED_VARIABLES: { IAM_ACCOUNT },
    GCLOUD_FILE_CRIDENTIALS_NAME
  } = externalContext;

  const command = `gcloud iam service-accounts keys create ${GCLOUD_FILE_CRIDENTIALS_NAME} --iam-account=${IAM_ACCOUNT}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function loginGcloud(externalContext: any, cb: Function): void {
  const {
    GCLOUD_FILE_CRIDENTIALS_NAME
  } = externalContext;

  const command = `gcloud auth activate-service-account --key-file ${GCLOUD_FILE_CRIDENTIALS_NAME}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createProject(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    PROJECT_NAME,
    FOLDER_ID,
    PROJECT_LABELS
  } = externalContext;

  const command = `gcloud projects create ${PROJECT_ID} ${ FOLDER_ID ? '--folder=' + FOLDER_ID : '' } --labels=${PROJECT_LABELS} --name=${PROJECT_ID} --enable-cloud-apis`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => {
    if (_.isNil(error) && 0) {
      console.error(
        `\nAPI [compute.googleapis.com] not enabled on project [${PROJECT_ID}]. Link billing account at https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}\n\n`,
        `Please enable Google Container Registry API in Cloud Console at https://console.cloud.google.com/apis/api/containerregistry.googleapis.com/overview?project=${PROJECT_ID}\n`
      );
      return cb('ATTENTION: Don\'t forget enabling all needed permissions', externalContext);
    }

    if (_.includes(error, 'The project ID you specified is already in use by another project')) {
      console.log('RESULT: So, skipping the step..\n');
      return cb(null, externalContext);
    }

    return cb(error, externalContext);
  });
}

export function buildImageTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    MONGODB_URL,
    REDIS_HOST,
    COMPUTED_VARIABLES
  } = externalContext;

  const dockerArguments: DockerBuildArgumentsTM = Object.assign({
    PORT,
    REDIS_HOST,
    MONGODB_URL,
    MACHINE_SUFFIX,
    THRASHING_MACHINE: true
  }, COMPUTED_VARIABLES);

  const commandArgs = getDockerArguments(dockerArguments);
  const command = `docker build --rm -t ${IMAGE_URL} ${commandArgs} .`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function buildImageNode(externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    REDIS_HOST,
    MONGODB_URL,
    COMPUTED_VARIABLES
  } = externalContext;

  const dockerArguments: DockerBuildArguments = Object.assign({
    PORT,
    REDIS_HOST,
    MONGODB_URL,
    MACHINE_SUFFIX
  }, COMPUTED_VARIABLES);

  const commandArgs = getDockerArguments(dockerArguments);
  const command = `docker build --rm -t ${IMAGE_URL} ${commandArgs} .`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function pushImageTM(externalContext: any, cb: Function): void {
  const { TM_INSTANCE_VARIABLES: { IMAGE_URL } } = externalContext;

  const command = `gcloud docker -- push ${IMAGE_URL}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function pushImageNode(externalContext: any, cb: Function): void {
  const { NODE_INSTANCE_VARIABLES: { IMAGE_URL } } = externalContext;

  const command = `gcloud docker -- push ${IMAGE_URL}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createRedis(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_CONTAINER_IMAGE,
    REDIS_INSTANCE_NAME,
    REDIS_ZONE
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud beta compute instances create-with-container ${REDIS_INSTANCE_NAME} --machine-type=g1-small --zone=${REDIS_ZONE} --container-image=${REDIS_CONTAINER_IMAGE} --format json`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    console.log('\n', result.stdout, '\n');

    try {
      const [{ networkInterfaces: [{ networkIP, subnetwork }] }] = JSON.parse(result.stdout);
      console.log('\nREDIS INTERNAL IP:', networkIP, '\n');
      externalContext.REDIS_HOST = networkIP;
      externalContext.REDIS_SUBNETWORK = subnetwork;
    } catch (_error) {
      return cb(_error, externalContext);
    }

    return cb(error, externalContext);
  });
}

export function reserveRedisInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_HOST,
    REDIS_SUBNETWORK,
    REDIS_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-redis-address-${VERSION}`;
  //fixme: REGION, --project=${PROJECT_ID}
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --region=${REDIS_REGION} --subnet ${REDIS_SUBNETWORK} --addresses ${REDIS_HOST}`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createMongo(externalContext: any, cb: Function): void {
  const {
    MONGO_ZONE,
    PROJECT_ID,
    MONGO_PORT,
    MONGO_CONTAINER_IMAGE,
    MONGO_INSTANCE_NAME
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud beta compute instances create-with-container ${MONGO_INSTANCE_NAME} --machine-type=n1-highmem-2 --zone=${MONGO_ZONE} --container-image=${MONGO_CONTAINER_IMAGE} --format json`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    console.log('\n', result.stdout, '\n');

    try {
      const [{ networkInterfaces: [{ networkIP, subnetwork }] }] = JSON.parse(result.stdout);
      externalContext.MONGO_HOST = networkIP;
      externalContext.MONGO_SUBNETWORK = subnetwork;
      externalContext.MONGODB_URL = `mongodb://${externalContext.MONGO_HOST}:${MONGO_PORT}`;
      console.log('\nMONGO INTERNAL IP:', externalContext.MONGO_HOST, '\n');
      console.log('\nMONGO URL:', externalContext.MONGODB_URL, '\n');
    } catch (_error) {
      return cb(_error, externalContext);
    }

    return cb(error, externalContext);
  });
}

export function reserveMongoInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    MONGO_HOST,
    MONGO_SUBNETWORK,
    MONGO_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-mongo-address-${VERSION}`;
  //fixme: REGION, --project=${PROJECT_ID}
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --region ${MONGO_REGION} --subnet ${MONGO_SUBNETWORK} --addresses ${MONGO_HOST}`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IMAGE_URL,
      NODE_NAME: TM_INSTANCE_NAME
    },
    TM_ZONE,
    PROJECT_ID
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud beta compute instances create-with-container ${TM_INSTANCE_NAME} --tags=${TM_INSTANCE_NAME} --machine-type=n1-highmem-2 --zone=${TM_ZONE} --container-image=${IMAGE_URL}  --format json`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    console.log('\n', result.stdout, '\n');

    try {
      const [{ networkInterfaces: [{ accessConfigs: [{ natIP: networkIP }] }] }] = JSON.parse(result.stdout);
      console.log('\nTM EXTERNAL IP:', networkIP, '\n');

      externalContext.TM_INSTANCE_VARIABLES.IP_ADDRESS = networkIP;

    } catch (_error) {
      return cb(_error, externalContext);
    }

    return cb(error, externalContext);
  });
}

export function allowHttpTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    PROJECT_ID,
    FIREWALL_RULE__ALLOW_HTTP
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud compute firewall-rules create ${FIREWALL_RULE__ALLOW_HTTP} --allow=tcp:80,tcp:443 --target-tags=${TM_INSTANCE_NAME}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));

}

export function promoteExternalIP(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IP_ADDRESS
    },
    PROJECT_ID,
    TM_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-tm-address-${VERSION}`;
  //fixme: REGION, --project=${PROJECT_ID}
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --addresses ${IP_ADDRESS} --region ${TM_REGION}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createCluster(externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: { MACHINE_TYPE },
    PROJECT_ID, CLUSTER_NAME, CREATE_CLUSTER__ALLOWED_PARAMS
  } = externalContext;

  const gcloudArgs = _.pick(externalContext, CREATE_CLUSTER__ALLOWED_PARAMS);
  const commandArgs = getGCloudArguments(gcloudArgs);
  //fixme: --project=${PROJECT_ID}
  const command = `gcloud container clusters create ${CLUSTER_NAME} ${commandArgs} --machine-type=${MACHINE_TYPE}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createNodePools(externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: { MACHINE_TYPE },
    PROJECT_ID, CLUSTER_NAME, NODE_POOLS_NAME,
    NUM_NODES,
    MAX_NODES,
    MIN_NODES,
    VERSION_TAGS,
    ZONE
  } = externalContext;

  //fixme: --project=${PROJECT_ID}
  const command = `gcloud container node-pools create ${NODE_POOLS_NAME} --cluster=${CLUSTER_NAME} --machine-type=${MACHINE_TYPE} --num-nodes=${NUM_NODES} --tags=${VERSION_TAGS} --zone=${ZONE}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createPods(externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: { IMAGE_URL, PORT },
    REPLICAS_NAME,
    CLUSTER_NAME,
    NUMBER_REPLICAS
  } = externalContext;

  const command = `kubectl run ${REPLICAS_NAME} --image=${IMAGE_URL} --port=${PORT} --replicas=${NUMBER_REPLICAS}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createReplicas(externalContext: any, cb: Function): void {
  const {
    NUMBER_REPLICAS,
    REPLICAS_NAME,
    CLUSTER_NAME
  } = externalContext;

  const command = `kubectl scale deployment ${REPLICAS_NAME} --replicas=${NUMBER_REPLICAS}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupAutoscale(externalContext: any, cb: Function): void {
  const {
    MIN_NUMBER_REPLICAS,
    MAX_NUMBER_REPLICAS,
    REPLICAS_NAME,
    CPU_PERCENT,
    CLUSTER_NAME
  } = externalContext;

  const command = `kubectl autoscale deployment ${REPLICAS_NAME} --min=${MIN_NUMBER_REPLICAS} --max=${MAX_NUMBER_REPLICAS} --cpu-percent=${CPU_PERCENT}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupLoadbalancer(externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: { PORT: TARGET_PORT },
    SOURCE_PORT,
    REPLICAS_NAME,
    LOAD_BALANCER_NAME,
    CLUSTER_NAME
  } = externalContext;

  const command = `kubectl expose deployment ${REPLICAS_NAME} --port=${SOURCE_PORT} --target-port=${TARGET_PORT} --name=${LOAD_BALANCER_NAME} --type=LoadBalancer`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function printExternalIPs(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IP_ADDRESS: TM_IP_ADDRESS
    },
    LOAD_BALANCER_NAME
  } = externalContext;

  const command = `kubectl get service ${LOAD_BALANCER_NAME}`;
  const options: ExecOptions = {};

  runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    try {
      const parsedResult = JSON.parse(result.stdout);
      const LOAD_BALANCER_IP_ADDRESS = _.get(parsedResult, 'status.loadBalancer.ingress.0.ip', null);

      console.log('\nRESULTS: \n', `TM: ${TM_IP_ADDRESS}\n`, `LB: ${LOAD_BALANCER_IP_ADDRESS}\n`);

      return cb(null, LOAD_BALANCER_IP_ADDRESS);
    } catch (_error) {
      console.error('JSON parse syntax error with LOAD_BALANCER_IP_ADDRESS. Retry to connect again..');

      return cb();
    }
  });
}
