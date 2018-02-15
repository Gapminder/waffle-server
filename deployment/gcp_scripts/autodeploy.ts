import * as async from 'async';
import { GCloudArguments } from './interfaces';
import { setupRedisInstance } from './redis.helpers';
import { setupMongoInstance } from './mongo.helpers';
import { getContextInstance } from './common.helpers';

import {
  setDefaultUser, createProject, setDefaultProject,
  setupAPIs, linkProjectToBilling,
  buildImageTM, buildImageNode, pushImageTM, pushImageNode,
  createTM, getTMExternalIP, promoteTMExternalIP, allowHttpTM,
  createCluster, createPods, createReplicas, setupAutoscale, setupLoadbalancer, printExternalIPs
} from './autodeploy.helpers';

// Default variables
const packageJson = require('../../package.json');
const {
  DEFAULT_NODE_ENV,
  DEFAULT_ENVIRONMENTS,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS,
  DEFAULT_MACHINE_TYPES,
  DEFAULT_DISK_SIZES,
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_MACHINE_SUFFIXES,
  DEFAULT_GCP_VARIABLES,
  DEFAULT_GCP_API
} = require('./default_deployment_config.json');

function setupEnvironment(): object {
  // Computed variables
  const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;
  const ENVIRONMENT = DEFAULT_ENVIRONMENTS[NODE_ENV] || NODE_ENV;
  const VERSION_TAG = packageJson.version;
  const VERSION = packageJson.version.replace(/\./g, '-');
  const STATIC_VARIABLES = require(`./deployment_config_${ENVIRONMENT}.json`);
  const DEFAULT_REGION = STATIC_VARIABLES.REGION || DEFAULT_GCP_VARIABLES.DEFAULT_REGION;
  const REDIS_REGION = STATIC_VARIABLES.REDIS_REGION || DEFAULT_REGION;
  const MONGO_REGION = STATIC_VARIABLES.MONGO_REGION || DEFAULT_REGION;
  const TM_REGION = STATIC_VARIABLES.TM_REGION || DEFAULT_REGION;
  const LB_REGION = STATIC_VARIABLES.LB_REGION || DEFAULT_REGION;

  const TM_MACHINE_TYPE = STATIC_VARIABLES.TM_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.TM;
  const WS_MACHINE_TYPE = STATIC_VARIABLES.WS_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.WS;
  const REDIS_MACHINE_TYPE = STATIC_VARIABLES.REDIS_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.REDIS;
  const MONGO_MACHINE_TYPE = STATIC_VARIABLES.MONGO_MACHINE_TYPE || DEFAULT_MACHINE_TYPES.MONGO;

  const TM_DISK_SIZE = STATIC_VARIABLES.TM_DISK_SIZE || DEFAULT_DISK_SIZES.TM;
  const WS_DISK_SIZE = STATIC_VARIABLES.WS_DISK_SIZE || DEFAULT_DISK_SIZES.WS;
  const REDIS_DISK_SIZE = STATIC_VARIABLES.REDIS_DISK_SIZE || DEFAULT_DISK_SIZES.REDIS;
  const MONGO_DISK_SIZE = STATIC_VARIABLES.MONGO_DISK_SIZE || DEFAULT_DISK_SIZES.MONGO;

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
    MONGO_INSTANCE_NAME: `${ENVIRONMENT}-mongo-${VERSION}`,
    MONGODB_PORT: STATIC_VARIABLES.MONGODB_PORT || DEFAULT_GCP_VARIABLES.DEFAULT_MONGODB_PORT,
    MONGODB_SSH_KEY: STATIC_VARIABLES.MONGODB_SSH_KEY,
    REPLICAS_NAME: `${ENVIRONMENT}-replicas-${VERSION}`,
    LOAD_BALANCER_NAME: `${ENVIRONMENT}-lb-${VERSION}`,
    FIREWALL_RULE__ALLOW_HTTP: `${ENVIRONMENT}-allow-http-${VERSION}`,
    FIREWALL_RULE__ALLOWED_PORTS: STATIC_VARIABLES.FIREWALL_RULE__ALLOWED_PORTS || DEFAULT_GCP_VARIABLES.FIREWALL_RULE__ALLOWED_PORTS,

    REGION: DEFAULT_REGION,
    REDIS_REGION,
    MONGO_REGION,
    TM_REGION,
    LB_REGION,

    TM_MACHINE_TYPE,
    WS_MACHINE_TYPE,
    REDIS_MACHINE_TYPE,
    MONGO_MACHINE_TYPE,

    TM_DISK_SIZE,
    WS_DISK_SIZE,
    REDIS_DISK_SIZE,
    MONGO_DISK_SIZE,

    ZONE: `${ DEFAULT_REGION }-c`,
    REDIS_ZONE: `${ REDIS_REGION }-c`,
    MONGO_ZONE: `${ MONGO_REGION }-c`,
    TM_ZONE: `${ TM_REGION }-c`,
    LB_ZONE: `${ LB_REGION }-c`,

    MACHINE_TYPES: Object.assign({}, DEFAULT_MACHINE_TYPES)
  });

  const primaryContext = Object.assign({
    COMPUTED_VARIABLES,
    DEFAULT_MACHINE_TYPES,
    DEFAULT_IMAGE_NAME_SUFFIXES,
    DEFAULT_TM_PORTS,
    DEFAULT_WS_PORTS
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
    async.waterfall([
      async.constant(setupEnvironment()),
      setDefaultUser,
      createProject,
      setDefaultProject,
      async.apply(setupAPIs, ['cloudbilling.googleapis.com'], { action: 'enable' }),
      linkProjectToBilling,
      async.apply(setupAPIs, DEFAULT_GCP_API, { action: 'enable' }),
      setupRedisInstance,
      setupMongoInstance,
      buildImageTM,
      buildImageNode,
      pushImageTM,
      pushImageNode,
      createTM,
      getTMExternalIP,
      promoteTMExternalIP,
      allowHttpTM,
      createCluster,
      createPods,
      createReplicas,
      setupAutoscale,
      setupLoadbalancer,
      printExternalIPs
    ], function (error: string, result: any): void {
      if (error) {
        console.error(error);
        return reject(error);
      }

      return resolve();
    });
  });
}

