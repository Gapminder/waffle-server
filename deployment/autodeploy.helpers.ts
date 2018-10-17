import * as _ from 'lodash';
import * as async from 'async';
import { AsyncResultCallback } from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { DockerBuildArguments } from './interfaces';
import * as commonHelpers from '../deployment/common.helpers';
import { loggerFactory } from '../ws.config/log';

export const pathToLoadBalancerIP = 'status.loadBalancer.ingress.0.ip';
export const pathToTMNetworkIP = 'networkInterfaces.0.accessConfigs.0.natIP';
const GCP_STACK_ACTION = process.env.GCP_STACK_ACTION;

export function setDefaultUser (externalContext: any, cb: Function): void {
  const {
    COMPUTED_VARIABLES: { OWNER_ACCOUNT }
  } = externalContext;

  const command = `gcloud config set account ${OWNER_ACCOUNT}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createProject (externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    FOLDER_ID,
    PROJECT_LABELS
  } = externalContext;

  const logger = loggerFactory.getLogger(GCP_STACK_ACTION);
  const command = `gcloud projects create ${PROJECT_ID} ${ FOLDER_ID ? '--folder=' + FOLDER_ID : '' } --labels=${PROJECT_LABELS} --name=${PROJECT_ID} --enable-cloud-apis`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => {
    if (_.includes(error, 'The project ID you specified is already in use by another project')) {
      logger.info('RESULT: So, skipping the step..');
      return cb(null, externalContext);
    }

    return cb(error, externalContext);
  });
}

export function setDefaultProject (externalContext: any, cb: Function): void {
  const {
    PROJECT_ID
  } = externalContext;

  const command = `gcloud config set project ${PROJECT_ID}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupAPIs (apisList: string[], options: any, externalContext: any, cb: Function): void {
  const { action = 'enable' } = options;
  const logger = loggerFactory.getLogger(GCP_STACK_ACTION);

  if (process.env.IGNORE_ENABLING_GCP_API !== 'false') {
    logger.info('Ignore step with setting up gcp API');
    return cb(null, externalContext);
  }

  async.eachSeries(apisList, (api: string, _cb: AsyncResultCallback<ExecOutputReturnValue, string>) => {
    const command = `gcloud services ${action} ${api}`;
    const shellOptions: ExecOptions = {};

    return commonHelpers.runShellCommand(command, shellOptions, _cb);
  }, (error: string) => {
    return cb(error, externalContext);
  });
}

export function linkProjectToBilling (externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    COMPUTED_VARIABLES: { BILLING_ACCOUNT }
  } = externalContext;

  const command = `gcloud beta billing projects link ${PROJECT_ID} --billing-account=${BILLING_ACCOUNT}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function buildImageTM (externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    MACHINE_TYPES,
    PROJECT_ID,
    REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      NODE_ENV,
      VERSION,
      VERSION_TAG,
      RELEASE_DATE,
      DEFAULT_PROJECT_NAME,
      DEFAULT_USER_PASSWORD,
      PATH_TO_DDF_REPOSITORIES,
      NEW_RELIC_LICENSE_KEY,
      INFLUXDB_HOST,
      INFLUXDB_PORT,
      INFLUXDB_DATABASE_NAME,
      INFLUXDB_USER,
      INFLUXDB_PASSWORD,
      DEFAULT_DATASETS,
      S3_SECRET_KEY,
      S3_ACCESS_KEY,
      S3_BUCKET
    }
  } = externalContext;

  const dockerArguments: DockerBuildArguments = Object.assign({
    ENVIRONMENT,
    NODE_ENV,
    PROJECT: PROJECT_ID,
    REGION,
    MACHINE_TYPE: MACHINE_TYPES[ MACHINE_SUFFIX ],
    VERSION,
    VERSION_TAG,
    RELEASE_DATE,
    PORT,
    MACHINE_SUFFIX,
    DEFAULT_PROJECT_NAME,
    DEFAULT_USER_PASSWORD,
    PATH_TO_DDF_REPOSITORIES,
    NEW_RELIC_LICENSE_KEY,
    INFLUXDB_HOST,
    INFLUXDB_PORT,
    INFLUXDB_DATABASE_NAME,
    INFLUXDB_USER,
    INFLUXDB_PASSWORD,
    DEFAULT_DATASETS,
    S3_SECRET_KEY,
    S3_ACCESS_KEY,
    S3_BUCKET
  });

  const commandArgs = commonHelpers.getDockerArguments(dockerArguments);
  const command = `docker build --rm -t ${IMAGE_URL} ${commandArgs} .`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function buildImageNode (externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: {
      MACHINE_SUFFIX,
      IMAGE_URL,
      PORT
    },
    MACHINE_TYPES,
    PROJECT_ID,
    REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      NODE_ENV,
      VERSION,
      VERSION_TAG,
      RELEASE_DATE,
      DEFAULT_PROJECT_NAME,
      DEFAULT_USER_PASSWORD,
      PATH_TO_DDF_REPOSITORIES,
      NEW_RELIC_LICENSE_KEY,
      INFLUXDB_HOST,
      INFLUXDB_PORT,
      INFLUXDB_DATABASE_NAME,
      INFLUXDB_USER,
      INFLUXDB_PASSWORD,
      S3_SECRET_KEY,
      S3_ACCESS_KEY,
      S3_BUCKET
    }
  } = externalContext;

  const dockerArguments: DockerBuildArguments = Object.assign({
    ENVIRONMENT,
    NODE_ENV,
    PROJECT: PROJECT_ID,
    REGION,
    MACHINE_TYPE: MACHINE_TYPES[ MACHINE_SUFFIX ],
    VERSION_TAG,
    VERSION,
    RELEASE_DATE,
    PORT,
    DEFAULT_PROJECT_NAME,
    DEFAULT_USER_PASSWORD,
    PATH_TO_DDF_REPOSITORIES,
    NEW_RELIC_LICENSE_KEY,
    INFLUXDB_HOST,
    INFLUXDB_PORT,
    INFLUXDB_DATABASE_NAME,
    INFLUXDB_USER,
    INFLUXDB_PASSWORD,
    MACHINE_SUFFIX,
    S3_SECRET_KEY,
    S3_ACCESS_KEY,
    S3_BUCKET
  });

  const commandArgs = commonHelpers.getDockerArguments(dockerArguments);
  const command = `docker build --rm -t ${IMAGE_URL} ${commandArgs} .`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function pushImageTM (externalContext: any, cb: Function): void {
  const { TM_INSTANCE_VARIABLES: { IMAGE_URL } } = externalContext;

  const command = `gcloud docker -- push ${IMAGE_URL}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function pushImageNode (externalContext: any, cb: Function): void {
  const { NODE_INSTANCE_VARIABLES: { IMAGE_URL } } = externalContext;

  const command = `gcloud docker -- push ${IMAGE_URL}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createTM (externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IMAGE_URL,
      NODE_NAME: TM_INSTANCE_NAME
    },
    TM_ZONE,
    TM_MACHINE_TYPE,
    TM_DISK_SIZE
  } = externalContext;

  const command = `gcloud compute instances create-with-container ${TM_INSTANCE_NAME} --tags=${TM_INSTANCE_NAME} --machine-type=${TM_MACHINE_TYPE} --boot-disk-size=${TM_DISK_SIZE} --zone=${TM_ZONE} --container-image=${IMAGE_URL}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    return cb(error, externalContext);
  });
}

export function getTMExternalIP (externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    TM_ZONE
  } = externalContext;

  const command = `gcloud compute instances describe ${TM_INSTANCE_NAME} --zone=${TM_ZONE}`;
  const options: any = { pathsToCheck: [ pathToTMNetworkIP ] };
  const logger = loggerFactory.getLogger(GCP_STACK_ACTION);

  return commonHelpers.runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    if (error) {
      return cb(error, externalContext);
    }

    try {
      logger.info(result.stdout);

      const parsedStdout = JSON.parse(result.stdout);

      externalContext.TM_INSTANCE_VARIABLES.IP_ADDRESS = _.get(parsedStdout, pathToTMNetworkIP, false);

      logger.info(`TM EXTERNAL IP: ${externalContext.TM_INSTANCE_VARIABLES.IP_ADDRESS}`);

    } catch (_error) {
      return cb(_error.message, externalContext);
    }

    return cb(null, externalContext);
  });
}

export function allowHttpTM (externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    FIREWALL_RULE__ALLOW_HTTP,
    FIREWALL_RULE__ALLOWED_PORTS
  } = externalContext;

  const command = `gcloud compute firewall-rules create ${FIREWALL_RULE__ALLOW_HTTP} --allow=${FIREWALL_RULE__ALLOWED_PORTS} --target-tags=${TM_INSTANCE_NAME}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));

}

export function promoteTMExternalIP (externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      IP_ADDRESS
    },
    TM_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-tm-address-${VERSION}`;
  const command = `gcloud compute addresses create ${ADDRESS_NAME} --addresses ${IP_ADDRESS} --region ${TM_REGION}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupGcloudContainerConfig (externalContext: any, cb: Function): void {
  const command = `gcloud config set container/new_scopes_behavior true`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createCluster (externalContext: any, cb: Function): void {
  const {
    WS_MACHINE_TYPE, WS_DISK_SIZE, CLUSTER_NAME, CREATE_CLUSTER__ALLOWED_PARAMS
  } = externalContext;

  const gcloudArgs = _.pick(externalContext, CREATE_CLUSTER__ALLOWED_PARAMS);
  const commandArgs = commonHelpers.getGCloudArguments(gcloudArgs);
  const command = `gcloud container clusters create ${CLUSTER_NAME} ${commandArgs} --machine-type=${WS_MACHINE_TYPE} --disk-size=${WS_DISK_SIZE} --enable-legacy-authorization --enable-basic-auth --no-issue-client-certificate --enable-ip-alias`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createPods (externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: { IMAGE_URL, PORT },
    REPLICAS_NAME,
    NUMBER_REPLICAS,
    REPLICAS_REQUESTS,
  } = externalContext;

  // --limits='${REPLICAS_REQUESTS}'
  const command = `kubectl run ${REPLICAS_NAME} --requests='${REPLICAS_REQUESTS}' --image=${IMAGE_URL} --port=${PORT} --replicas=${NUMBER_REPLICAS}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function createReplicas (externalContext: any, cb: Function): void {
  const {
    NUMBER_REPLICAS,
    REPLICAS_NAME
  } = externalContext;

  const command = `kubectl scale ${REPLICAS_NAME} --replicas=${NUMBER_REPLICAS}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupAutoscale (externalContext: any, cb: Function): void {
  const {
    MIN_NUMBER_REPLICAS,
    MAX_NUMBER_REPLICAS,
    REPLICAS_NAME,
    CPU_PERCENT
  } = externalContext;

  const command = `kubectl autoscale deployment ${REPLICAS_NAME} --min=${MIN_NUMBER_REPLICAS} --max=${MAX_NUMBER_REPLICAS} --cpu-percent=${CPU_PERCENT}`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function setupLoadbalancer (externalContext: any, cb: Function): void {
  const {
    NODE_INSTANCE_VARIABLES: { PORT: TARGET_PORT },
    SOURCE_PORT,
    REPLICAS_NAME,
    LOAD_BALANCER_NAME
  } = externalContext;

  const command = `kubectl expose deployment ${REPLICAS_NAME} --port=${SOURCE_PORT} --target-port=${TARGET_PORT} --name=${LOAD_BALANCER_NAME} --type=LoadBalancer`;
  const options: ExecOptions = {};

  return commonHelpers.runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function getLoadbalancerExternalIP (externalContext: any, cb: Function): void {
  const {
    LOAD_BALANCER_NAME
  } = externalContext;

  const command = `kubectl -ojson get svc ${LOAD_BALANCER_NAME}`;
  const options: any = { pathsToCheck: [ pathToLoadBalancerIP ] };
  const logger = loggerFactory.getLogger(GCP_STACK_ACTION);

  return commonHelpers.runShellCommand(command, options, (error: string, result: ExecOutputReturnValue) => {
    if (error) {
      return cb(error, externalContext);
    }

    try {
      logger.info(result.stdout);

      const parsedStdout = JSON.parse(result.stdout);

      externalContext.LOAD_BALANCER_IP_ADDRESS = _.get(parsedStdout, pathToLoadBalancerIP, false);

      logger.info(`LOAD BALANCER EXTERNAL IP: ${externalContext.LOAD_BALANCER_IP_ADDRESS}`);

    } catch (_error) {
      return cb(_error.message, externalContext);
    }

    return cb(null, externalContext);
  });
}

export function printExternalIPs (externalContext: any, cb: Function): void {
  const {
    // TM_INSTANCE_VARIABLES: { IP_ADDRESS },
    LOAD_BALANCER_IP_ADDRESS: IP_ADDRESS
  } = externalContext;

  const logger = loggerFactory.getLogger(GCP_STACK_ACTION);

  logger.info({
    RESULTS: {
      LOAD_BALANCER: IP_ADDRESS,
      ASSETS_DEFAULT: `http://${IP_ADDRESS}/api/ddf/assets/default/assets/world-50m.json`,
      ASSETS: `http://${IP_ADDRESS}/api/ddf/assets/open-numbers/ddf--gapminder--systema_globalis/master/assets/world-50m.json`,
      DDFQL: `http://${IP_ADDRESS}/api/ddf/ql?_language=en&from=entities&animatable=time&select_key@=geo;&value@=name;;&where_$and@_un/_state:true;;;&join_;&order/_by@=rank;&dataset=open-numbers%252Fddf--gapminder--systema/_globalis`
    }
  });

  return async.setImmediate(() => cb(null, externalContext));
}

