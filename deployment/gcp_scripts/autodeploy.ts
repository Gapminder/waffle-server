import * as async from 'async';

import {
  createCridentials, loginGcloud, enableCloudBillingAPI, enableComputeService, enableContainerRegistryAPI, enableStackdriverLoggingAPI, linkProjectToBilling, setDefaultProject, setDefaultUser,
  allowHttpTM, buildImageNode, buildImageTM, createCluster, createPods, createProject, createRedis, getRedisInternalIP, createMongo, getMongoInternalIP,
  createReplicas, createTM, getTMExternalIP, promoteExternalIP, pushImageNode, pushImageTM, reserveRedisInternalIP, reserveMongoInternalIP, setupAutoscale,
  setupLoadbalancer, printExternalIPs
} from './autodeploy.helpers';
import { getContextInstance } from './common.helpers';
import { GCloudArguments } from './interfaces';

// Default variables
const packageJson = require('../../package.json');
const {
  DEFAULT_NODE_ENV,
  DEFAULT_ENVIRONMENTS,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS,
  DEFAULT_MACHINE_TYPES,
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_MACHINE_SUFFIXES,
  DEFAULT_GCP_VARIABLES
} = require('./default_deployment_config.json');

// Computed variables

const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;
const ENVIRONMENT = DEFAULT_ENVIRONMENTS[NODE_ENV];
const VERSION_TAG = packageJson.version;
const VERSION = packageJson.version.replace(/\./g, '-');
const STATIC_VARIABLES = require(`./settings_gapminder_${ENVIRONMENT}.json`);

const COMPUTED_VARIABLES = Object.assign({
  NODE_ENV,
  ENVIRONMENT,
  STACK_NAME: `${ENVIRONMENT}-stack-${VERSION}`,
  RELEASE_DATE: (new Date()).toISOString(),
  VERSION,
  VERSION_TAG
}, STATIC_VARIABLES);

// gcloud variables
const GCP_VARIABLES = Object.assign({
  PROJECT_ID: `${STATIC_VARIABLES.DEFAULT_PROJECT_NAME}-${ENVIRONMENT}`,
  PROJECT_LABELS: `environment=${ENVIRONMENT}`,
  CLUSTER_NAME: `${ENVIRONMENT}-cluster-${VERSION}`,
  NAME_SPACE_NODE: `${ENVIRONMENT}-namespace-${VERSION}`,
  REDIS_INSTANCE_NAME: `${ENVIRONMENT}-redis-${VERSION}`,
  MONGO_INSTANCE_NAME: `${ENVIRONMENT}-mongo-${VERSION}`,
  MONGO_PORT: STATIC_VARIABLES.MONGO_PORT || DEFAULT_GCP_VARIABLES.MONGO_PORT,
  REPLICAS_NAME: `${ENVIRONMENT}-replicas-${VERSION}`,
  LOAD_BALANCER_NAME: `${ENVIRONMENT}-lb-${VERSION}`,
  FIREWALL_RULE__ALLOW_HTTP: `${ENVIRONMENT}-allow-http-${VERSION}`,
  ZONE: `${DEFAULT_GCP_VARIABLES.REGION}-c`,
  REDIS_ZONE: `${DEFAULT_GCP_VARIABLES.REDIS_REGION}-c`,
  MONGO_ZONE: `${DEFAULT_GCP_VARIABLES.MONGO_REGION}-c`,
  TM_ZONE: `${DEFAULT_GCP_VARIABLES.TM_REGION}-c`,
  LB_ZONE: `${DEFAULT_GCP_VARIABLES.LB_REGION}-c`
}, DEFAULT_GCP_VARIABLES);

const primaryContext = Object.assign({
  COMPUTED_VARIABLES,
  DEFAULT_MACHINE_TYPES,
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS
}, GCP_VARIABLES);
const contextTM: GCloudArguments = getContextInstance(primaryContext, 'TM');
const contextNode: GCloudArguments = getContextInstance(primaryContext, 'WS'); // 'WS'
const context = Object.assign(primaryContext, {
  TM_INSTANCE_VARIABLES: contextTM,
  NODE_INSTANCE_VARIABLES: contextNode
});

async.waterfall([
  async.constant(context),
  setDefaultUser,
  createProject,
  setDefaultProject,
  enableCloudBillingAPI,
  linkProjectToBilling,
  enableComputeService,
  enableContainerRegistryAPI,
  enableStackdriverLoggingAPI,
  createRedis,
  getRedisInternalIP,
  reserveRedisInternalIP,
  createMongo,
  getMongoInternalIP,
  reserveMongoInternalIP,
  buildImageTM,
  buildImageNode,
  pushImageTM,
  pushImageNode,
  createTM,
  getTMExternalIP,
  promoteExternalIP,
  allowHttpTM,
  createCluster,
  createPods,
  createReplicas,
  setupAutoscale,
  setupLoadbalancer,
  printExternalIPs
], function (error: string, result: any) {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
});
