import * as _ from 'lodash';
import * as async from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';

import { getDockerArguments, getGCloudArguments, runShellCommand } from './common.helpers';
import { DockerBuildArguments, DockerBuildArgumentsTM } from './interfaces';

export function createProject(externalContext: any, cb: Function) {
  const {
    PROJECT_ID,
    FOLDER_ID,
    PROJECT_LABELS
  } = externalContext;

  const command = `gcloud projects create ${PROJECT_ID} --folder=${FOLDER_ID} --labels=${PROJECT_LABELS} --enable-cloud-apis`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => {
    if (_.isNil(error)) {
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

export function buildImageTM(externalContext: any, cb: Function) {
  const {
    TM_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    REDIS_HOST,
    COMPUTED_VARIABLES
  } = externalContext;

  const dockerArguments: DockerBuildArgumentsTM = Object.assign({
    PORT,
    REDIS_HOST,
    MACHINE_SUFFIX,
    THRASHING_MACHINE: true
  }, COMPUTED_VARIABLES);

  const commandArgs = getDockerArguments(dockerArguments);
  const command = `docker build --rm -t ${IMAGE_URL} ${commandArgs} .`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function buildImageNode(externalContext: any, cb: Function) {
  const {
    NODE_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    REDIS_HOST,
    COMPUTED_VARIABLES
  } = externalContext;

  const dockerArguments: DockerBuildArguments = Object.assign({
    PORT,
    REDIS_HOST,
    MACHINE_SUFFIX
  }, COMPUTED_VARIABLES);

  const commandArgs = getDockerArguments(dockerArguments);
  const command = `docker build --rm -t ${IMAGE_URL} ${commandArgs} .`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function pushImageTM(externalContext: any, cb: Function) {
  const { TM_INSTANCE_VARIABLES: { IMAGE_URL } } = externalContext;

  const command = `gcloud docker -- push ${IMAGE_URL}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function pushImageNode(externalContext: any, cb: Function) {
  const { NODE_INSTANCE_VARIABLES: { IMAGE_URL } } = externalContext;

  const command = `gcloud docker -- push ${IMAGE_URL}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createRedis(externalContext: any, cb: Function) {
  const {
    ZONE,
    PROJECT_ID,
    REDIS_CONTAINER_IMAGE,
    REDIS_INSTANCE_NAME
  } = externalContext;

  const command = `gcloud beta compute instances create-with-container ${REDIS_INSTANCE_NAME} --machine-type=g1-small --zone ${ZONE} --container-image=${REDIS_CONTAINER_IMAGE} --project=${PROJECT_ID} --format json`;
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

export function reserveInternalIP(externalContext: any, cb: Function) {
  const {
    PROJECT_ID,
    REDIS_HOST,
    REDIS_SUBNETWORK,
    REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-redis-address-${VERSION}`;
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --region ${REGION} --subnet ${REDIS_SUBNETWORK} --addresses ${REDIS_HOST} --project=${PROJECT_ID}`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createTM(externalContext: any, cb: Function) {
  const {
    TM_INSTANCE_VARIABLES: {
      IMAGE_URL,
      NODE_NAME: TM_INSTANCE_NAME
    },
    ZONE,
    PROJECT_ID
  } = externalContext;

  const command = `gcloud beta compute instances create-with-container ${TM_INSTANCE_NAME} --tags=${TM_INSTANCE_NAME} --machine-type=n1-highmem-2 --zone ${ZONE} --container-image=${IMAGE_URL} --project=${PROJECT_ID} --format json`;
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

export function allowHttpTM(externalContext: any, cb: Function) {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    PROJECT_ID,
    FIREWALL_RULE__ALLOW_HTTP
  } = externalContext;

  const command = `gcloud compute firewall-rules create ${FIREWALL_RULE__ALLOW_HTTP} --allow=tcp:80 --target-tags=${TM_INSTANCE_NAME} --project=${PROJECT_ID}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));

}

export function promoteExternalIP(externalContext: any, cb: Function) {
  const {
    TM_INSTANCE_VARIABLES: {
      IP_ADDRESS
    },
    PROJECT_ID,
    REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-tm-address-${VERSION}`;
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --addresses ${IP_ADDRESS} --region ${REGION} --project=${PROJECT_ID}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createCluster(externalContext: any, cb: Function) {
  const { PROJECT_ID, CLUSTER_NAME, CREATE_CLUSTER__ALLOWED_PARAMS } = externalContext;

  const gcloudArgs = _.pick(externalContext, CREATE_CLUSTER__ALLOWED_PARAMS);
  const commandArgs = getGCloudArguments(gcloudArgs);
  const command = `gcloud container clusters create ${CLUSTER_NAME} ${commandArgs} --project=${PROJECT_ID}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createPods(externalContext: any, cb: Function) {
  const {
    NODE_INSTANCE_VARIABLES: { IMAGE_URL, PORT },
    REPLICAS_NAME,
    NUMBER_REPLICAS
  } = externalContext;

  const command = `kubectl run ${REPLICAS_NAME} --image=${IMAGE_URL} --port=${PORT} --replicas=${NUMBER_REPLICAS}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createReplicas(externalContext: any, cb: Function) {
  const {
    NUMBER_REPLICAS,
    REPLICAS_NAME
  } = externalContext;

  const command = `kubectl scale deployment ${REPLICAS_NAME} --replicas=${NUMBER_REPLICAS}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupAutoscale(externalContext: any, cb: Function) {
  const {
    MIN_NUMBER_REPLICAS,
    MAX_NUMBER_REPLICAS,
    REPLICAS_NAME,
    CPU_PERCENT
  } = externalContext;

  const command = `kubectl autoscale deployment ${REPLICAS_NAME} --min=${MIN_NUMBER_REPLICAS} --max=${MAX_NUMBER_REPLICAS} --cpu-percent=${CPU_PERCENT}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupLoadbalancer(externalContext: any, cb: Function) {
  const {
    NODE_INSTANCE_VARIABLES: { PORT: TARGET_PORT },
    SOURCE_PORT,
    REPLICAS_NAME,
    LOAD_BALANCER_NAME
  } = externalContext;

  const command = `kubectl expose deployment ${REPLICAS_NAME} --port=${SOURCE_PORT} --target-port=${TARGET_PORT} --name=${LOAD_BALANCER_NAME} --type=LoadBalancer`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
