import * as _ from 'lodash';
import * as async from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { DockerBuildArguments, DockerBuildArgumentsTM } from './interfaces';
import { getDockerArguments, getGCloudArguments, runShellCommand } from './common.helpers';
import { logger } from '../../ws.config/log';
import { AsyncResultCallback } from 'async';

export const pathToLoadBalancerIP = 'status.loadBalancer.ingress.0.ip';
export const pathToTMNetworkIP = 'networkInterfaces.0.accessConfigs.0.natIP';

export function setDefaultUser(externalContext: any, cb: Function): void {
  const {
    COMPUTED_VARIABLES: { OWNER_ACCOUNT }
  } = externalContext;

  const command = `gcloud config set account ${OWNER_ACCOUNT}`;
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
    if (_.includes(error, 'The project ID you specified is already in use by another project')) {
      logger.info('RESULT: So, skipping the step..\n');
      return cb(null, externalContext);
    }

    return cb(error, externalContext);
  });
}

export function setDefaultProject(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID
  } = externalContext;

  const command = `gcloud config set project ${PROJECT_ID}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupAPIs(apisList: string[], options: any, externalContext: any, cb: Function): void {
  const { action = 'enable' } = options;

  if (process.env.IGNORE_ENABLING_GCP_API === 'true') {
    logger.info('Ignore step with setting up gcp API');
    return cb(null, externalContext);
  }

  async.eachSeries(apisList, (api: string, _cb: AsyncResultCallback<ExecOutputReturnValue, string>) => {
    const command = `gcloud services ${action} ${api}`;
    const shellOptions: ExecOptions = {};

    return runShellCommand(command, shellOptions, _cb);
  }, (error: string) => {
    return cb(error, externalContext);
  });
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

export function buildImageTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    PROJECT_ID,
    REGION,
    MACHINE_TYPE,
    MONGODB_URL,
    REDIS_HOST,
    COMPUTED_VARIABLES: {
      DEFAULT_PROJECT_NAME,
      DEFAULT_USER_PASSWORD,
      PATH_TO_DDF_REPOSITORIES,
      NEW_RELIC_LICENSE_KEY,
      LOGS_SYNC_DISABLED,
      INFLUXDB_HOST,
      INFLUXDB_PORT,
      INFLUXDB_DATABASE_NAME,
      INFLUXDB_USER,
      INFLUXDB_PASSWORD,
      DEFAULT_DATASETS
    }
  } = externalContext;

  const dockerArguments: DockerBuildArgumentsTM = Object.assign({
    PORT,
    REDIS_HOST,
    MONGODB_URL,
    MACHINE_SUFFIX,
    DEFAULT_PROJECT_NAME,
    DEFAULT_USER_PASSWORD,
    PATH_TO_DDF_REPOSITORIES,
    NEW_RELIC_LICENSE_KEY,
    LOGS_SYNC_DISABLED,
    INFLUXDB_HOST,
    INFLUXDB_PORT,
    INFLUXDB_DATABASE_NAME,
    INFLUXDB_USER,
    INFLUXDB_PASSWORD,
    DEFAULT_DATASETS,
    THRASHING_MACHINE: true
  });

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
    COMPUTED_VARIABLES: {
      DEFAULT_PROJECT_NAME,
      DEFAULT_USER_PASSWORD,
      PATH_TO_DDF_REPOSITORIES,
      NEW_RELIC_LICENSE_KEY,
      LOGS_SYNC_DISABLED,
      INFLUXDB_HOST,
      INFLUXDB_PORT,
      INFLUXDB_DATABASE_NAME,
      INFLUXDB_USER,
      INFLUXDB_PASSWORD
    }
  } = externalContext;

  const dockerArguments: DockerBuildArguments = Object.assign({
    PORT,
    REDIS_HOST,
    MONGODB_URL,
    DEFAULT_PROJECT_NAME,
    DEFAULT_USER_PASSWORD,
    PATH_TO_DDF_REPOSITORIES,
    NEW_RELIC_LICENSE_KEY,
    LOGS_SYNC_DISABLED,
    INFLUXDB_HOST,
    INFLUXDB_PORT,
    INFLUXDB_DATABASE_NAME,
    INFLUXDB_USER,
    INFLUXDB_PASSWORD,
    MACHINE_SUFFIX
  });

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

export function createTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IMAGE_URL,
      NODE_NAME: TM_INSTANCE_NAME
    },
    TM_ZONE,
    TM_MACHINE_TYPE,
    TM_DISK_SIZE,
    PROJECT_ID
  } = externalContext;

  // fixme: --project=${PROJECT_ID}
  const command = `gcloud beta compute instances create-with-container ${TM_INSTANCE_NAME} --tags=${TM_INSTANCE_NAME} --machine-type=${TM_MACHINE_TYPE} --boot-disk-size=${TM_DISK_SIZE} --zone=${TM_ZONE} --container-image=${IMAGE_URL}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    return cb(error, externalContext);
  });
}

export function getTMExternalIP(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IMAGE_URL,
      NODE_NAME: TM_INSTANCE_NAME
    },
    TM_ZONE,
    PROJECT_ID
  } = externalContext;

  // fixme: --project=${PROJECT_ID}
  const command = `gcloud compute instances describe ${TM_INSTANCE_NAME} --zone=${TM_ZONE}`;
  const options: any = { pathsToCheck: [pathToTMNetworkIP] };

  return runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    if (error) {
      return cb(error, externalContext);
    }

    try {
      logger.info('\n', result.stdout, '\n');

      const parsedStdout = JSON.parse(result.stdout);

      externalContext.TM_INSTANCE_VARIABLES.IP_ADDRESS = _.get(parsedStdout, pathToTMNetworkIP, false);

      logger.info('\nTM EXTERNAL IP:', externalContext.TM_INSTANCE_VARIABLES.IP_ADDRESS, '\n');

    } catch (_error) {
      return cb(_error.message, externalContext);
    }

    return cb(null, externalContext);
  });
}

export function allowHttpTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    PROJECT_ID,
    FIREWALL_RULE__ALLOW_HTTP,
    FIREWALL_RULE__ALLOWED_PORTS
  } = externalContext;

  // fixme: --project=${PROJECT_ID}
  const command = `gcloud compute firewall-rules create ${FIREWALL_RULE__ALLOW_HTTP} --allow=${FIREWALL_RULE__ALLOWED_PORTS} --target-tags=${TM_INSTANCE_NAME}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));

}

export function promoteTMExternalIP(externalContext: any, cb: Function): void {
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
  // fixme: REGION, --project=${PROJECT_ID}
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --addresses ${IP_ADDRESS} --region ${TM_REGION}`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createCluster(externalContext: any, cb: Function): void {
  const {
    WS_MACHINE_TYPE, WS_DISK_SIZE,
    PROJECT_ID, CLUSTER_NAME, CREATE_CLUSTER__ALLOWED_PARAMS
  } = externalContext;

  const gcloudArgs = _.pick(externalContext, CREATE_CLUSTER__ALLOWED_PARAMS);
  const commandArgs = getGCloudArguments(gcloudArgs);
  // fixme: --project=${PROJECT_ID}
  const command = `gcloud container clusters create ${CLUSTER_NAME} ${commandArgs} --machine-type=${WS_MACHINE_TYPE} --disk-size=${WS_DISK_SIZE}`;
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
    MONGODB_URL,
    LOAD_BALANCER_NAME
  } = externalContext;

  const command = `kubectl get service ${LOAD_BALANCER_NAME}`;
  const options: any = { pathsToCheck: [pathToLoadBalancerIP] };

  runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    if (error) {
      return cb(error, externalContext);
    }

    try {
      logger.info(result.stdout);

      const parsedResult = JSON.parse(result.stdout);
      const LOAD_BALANCER_IP_ADDRESS = _.get(parsedResult, pathToLoadBalancerIP, null);

      logger.info({RESULTS:{ TM: TM_IP_ADDRESS, LB: LOAD_BALANCER_IP_ADDRESS, MONGODB: MONGODB_URL }});

      return cb(null, LOAD_BALANCER_IP_ADDRESS);
    } catch (_error) {
      logger.error('JSON parse syntax error with LOAD_BALANCER_IP_ADDRESS. Retry to connect again..');

      return cb();
    }
  });
}
