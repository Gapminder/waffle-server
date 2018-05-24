import * as async from 'async';
import { GCloudArguments } from './interfaces';
import { setupRedisInstance } from './redis.helpers';
import { getContextInstance } from './common.helpers';
import { logger } from '../ws.config/log';
import { DEFAULT_CONFIG } from './deployment_config.default';
import * as _ from 'lodash';

import {
  setDefaultUser, createProject, setDefaultProject,
  setupAPIs, linkProjectToBilling,
  buildImageTM, buildImageNode, pushImageTM, pushImageNode,
  createTM, getTMExternalIP, promoteTMExternalIP, allowHttpTM,
  createCluster, createPods, createReplicas, setupAutoscale, setupLoadbalancer, printExternalIPs
} from './autodeploy.helpers';

// Default variables
import * as packageJson from '../package.json';


function setupEnvironment(): any {
  const {
    DEFAULT_NODE_ENV,
    DEFAULT_PATH_TO_CONFIG_FILE,
    DEFAULT_ENVIRONMENTS,
    DEFAULT_TM_PORTS,
    DEFAULT_WS_PORTS,
    DEFAULT_MACHINE_TYPES,
    DEFAULT_DISK_SIZES,
    DEFAULT_IMAGE_NAME_SUFFIXES,
    DEFAULT_GCP_VARIABLES,
    DEFAULT_GCP_API,
    DEFAULT_REQUIRED_PARAMETERS
  } = DEFAULT_CONFIG; // placed it here for testing purpose

  // Computed variables
  const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;
  const ENVIRONMENT = DEFAULT_ENVIRONMENTS[NODE_ENV] || NODE_ENV;
  const VERSION_TAG = (packageJson as any).version;
  const VERSION = (packageJson as any).version.replace(/\./g, '-');
  const CONFIG_PATH = `${DEFAULT_PATH_TO_CONFIG_FILE}${ENVIRONMENT}.json`;
  const STATIC_VARIABLES = require(CONFIG_PATH);

  const givenStaticVariables = _.keys(STATIC_VARIABLES);
  const requiredStaticVariables = _.difference(DEFAULT_REQUIRED_PARAMETERS, givenStaticVariables);

  if (!_.isEmpty(requiredStaticVariables)) {
    throw new Error(`Failed to find required variables in file ${CONFIG_PATH}: ${requiredStaticVariables}`);
  }

  const DEFAULT_REGION = STATIC_VARIABLES.REGION || DEFAULT_GCP_VARIABLES.DEFAULT_REGION;
  const REDIS_REGION = STATIC_VARIABLES.REDIS_REGION || DEFAULT_REGION;
  const TM_REGION = STATIC_VARIABLES.TM_REGION || DEFAULT_REGION;
  const LB_REGION = STATIC_VARIABLES.LB_REGION || DEFAULT_REGION;

  const TM_MACHINE_TYPE = STATIC_VARIABLES.TM_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.TM;
  const WS_MACHINE_TYPE = STATIC_VARIABLES.WS_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.WS;
  const REDIS_MACHINE_TYPE = STATIC_VARIABLES.REDIS_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.REDIS;

  const TM_DISK_SIZE = STATIC_VARIABLES.TM_DISK_SIZE || DEFAULT_DISK_SIZES.TM;
  const WS_DISK_SIZE = STATIC_VARIABLES.WS_DISK_SIZE || DEFAULT_DISK_SIZES.WS;
  const REDIS_DISK_SIZE = STATIC_VARIABLES.REDIS_DISK_SIZE || DEFAULT_DISK_SIZES.REDIS;

  const MAX_NODES_PER_POOL = STATIC_VARIABLES.MAX_NODES_PER_POOL || DEFAULT_GCP_VARIABLES.MAX_NODES_PER_POOL;
  const MAX_NODES = STATIC_VARIABLES.MAX_NODES || DEFAULT_GCP_VARIABLES.MAX_NODES;
  const MIN_NODES = STATIC_VARIABLES.MIN_NODES || DEFAULT_GCP_VARIABLES.MIN_NODES;
  const NUM_NODES = STATIC_VARIABLES.NUM_NODES || DEFAULT_GCP_VARIABLES.NUM_NODES;
  const MAX_NUMBER_REPLICAS = STATIC_VARIABLES.MAX_NUMBER_REPLICAS || DEFAULT_GCP_VARIABLES.MAX_NUMBER_REPLICAS;
  const MIN_NUMBER_REPLICAS = STATIC_VARIABLES.MIN_NUMBER_REPLICAS || DEFAULT_GCP_VARIABLES.MIN_NUMBER_REPLICAS;
  const NUMBER_REPLICAS = STATIC_VARIABLES.NUMBER_REPLICAS || DEFAULT_GCP_VARIABLES.NUMBER_REPLICAS;
  const CPU_PERCENT = STATIC_VARIABLES.CPU_PERCENT || DEFAULT_GCP_VARIABLES.CPU_PERCENT;


  const COMPUTED_VARIABLES = Object.assign({
    NODE_ENV,
    ENVIRONMENT,
    STACK_NAME: `${ENVIRONMENT}-stack-${VERSION}`,
    RELEASE_DATE: (new Date()).toISOString(),
    VERSION,
    VERSION_TAG
  }, STATIC_VARIABLES);

  // gcloud variables
  const GCP_VARIABLES = Object.assign(DEFAULT_GCP_VARIABLES, {
    PROJECT_ID: `${ENVIRONMENT}-${STATIC_VARIABLES.DEFAULT_PROJECT_NAME}`,
    PROJECT_LABELS: `environment=${ENVIRONMENT}`,
    CLUSTER_NAME: `${ENVIRONMENT}-cluster-${VERSION}`,
    NAME_SPACE_NODE: `${ENVIRONMENT}-namespace-${VERSION}`,
    REDIS_INSTANCE_NAME: `${ENVIRONMENT}-redis-${VERSION}`,

    REPLICAS_NAME: `${ENVIRONMENT}-replicas-${VERSION}`,
    LOAD_BALANCER_NAME: `${ENVIRONMENT}-lb-${VERSION}`,
    FIREWALL_RULE__ALLOW_HTTP: `${ENVIRONMENT}-allow-http-${VERSION}`,
    FIREWALL_RULE__ALLOWED_PORTS: STATIC_VARIABLES.FIREWALL_RULE__ALLOWED_PORTS || DEFAULT_GCP_VARIABLES.FIREWALL_RULE__ALLOWED_PORTS,

    REGION: DEFAULT_REGION,
    REDIS_REGION,
    TM_REGION,
    LB_REGION,

    TM_MACHINE_TYPE,
    WS_MACHINE_TYPE,
    REDIS_MACHINE_TYPE,

    TM_DISK_SIZE,
    WS_DISK_SIZE,
    REDIS_DISK_SIZE,

    MAX_NODES_PER_POOL,
    MAX_NODES,
    MIN_NODES,
    NUM_NODES,
    MAX_NUMBER_REPLICAS,
    MIN_NUMBER_REPLICAS,
    NUMBER_REPLICAS,
    CPU_PERCENT,

    ZONE: `${ DEFAULT_REGION }-c`,
    REDIS_ZONE: `${ REDIS_REGION }-c`,
    TM_ZONE: `${ TM_REGION }-c`,
    LB_ZONE: `${ LB_REGION }-c`,

    MACHINE_TYPES: Object.assign({}, DEFAULT_MACHINE_TYPES)
  });

  const primaryContext = Object.assign({
    COMPUTED_VARIABLES,
    DEFAULT_MACHINE_TYPES,
    DEFAULT_IMAGE_NAME_SUFFIXES,
    DEFAULT_TM_PORTS,
    DEFAULT_WS_PORTS,
    DEFAULT_GCP_API
  }, GCP_VARIABLES);

  const contextTM: GCloudArguments = getContextInstance(primaryContext, 'TM');
  const contextNode: GCloudArguments = getContextInstance(primaryContext, 'WS'); // 'WS'

  return Object.assign(primaryContext, {
    TM_INSTANCE_VARIABLES: contextTM,
    NODE_INSTANCE_VARIABLES: contextNode
  });
}

export function run(): Promise<string | null> {
  return new Promise((resolve: Function, reject: Function) => {
    const context = setupEnvironment();

    async.waterfall([
      async.constant(context),
      setDefaultUser,
      createProject,
      setDefaultProject,
      async.apply(setupAPIs, ['cloudbilling.googleapis.com'], { action: 'enable' }),
      linkProjectToBilling,
      async.apply(setupAPIs, context.DEFAULT_GCP_API, { action: 'enable' }),
      // setupRedisInstance,
      buildImageTM,
      // buildImageNode,
      pushImageTM,
      // pushImageNode,
      createTM,
      getTMExternalIP,
      promoteTMExternalIP,
      allowHttpTM,
      // createCluster,
      // createPods,
      // setupAutoscale,
      // setupLoadbalancer,
      printExternalIPs
    ], function (error: string, result: any): void {
      if (error) {
        logger.error(error);
        return reject(error);
      }

      return resolve();
    });
  });
}

