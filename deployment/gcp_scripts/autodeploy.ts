import * as shell from 'shelljs';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';
import { ChildProcess } from 'child_process';
import * as _ from 'lodash';
import * as async from 'async';
import {DockerBuildArguments, DockerBuildArgumentsTM, GCloudArguments} from './interfaces';

import {  
  createProject,
  createRedis,
  reserveInternalIP,
  buildImageTM,
  buildImageNode,
  pushImageTM,
  pushImageNode,
  createTM,
  promoteExternalIP,
  createCluster,
  createPods,
  createReplicas,
  setupAutoscale,
  setupLoadbalancer
} from './autodeploy-helpers';

//*** Default variables
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

//*** Computed variables

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

//*** gcloud variables
const GCP_VARIABLES = Object.assign({
  PROJECT_ID: `${ENVIRONMENT}-waffle-server`,  
  PROJECT_LABELS: `environment=${ENVIRONMENT}`,
  CLUSTER_NAME: `${ENVIRONMENT}-cluster-${VERSION}`,
  NAME_SPACE_NODE: `${ENVIRONMENT}-namespace-${VERSION}`,
  REDIS_INSTANCE_NAME: `${ENVIRONMENT}-redis-${VERSION}`,
  REPLICAS_NAME: `${ENVIRONMENT}-replicas-${VERSION}`,
  LOAD_BALANCER_NAME: `${ENVIRONMENT}-lb-${VERSION}`,
  FIREWALL_RULE__ALLOW_HTTP: `${ENVIRONMENT}-allow-http-${VERSION}`,
  ZONE: `${DEFAULT_GCP_VARIABLES.REGION}-c`,  
}, DEFAULT_GCP_VARIABLES);

const primaryContext = Object.assign({
  COMPUTED_VARIABLES, 
  DEFAULT_MACHINE_TYPES, 
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS
}, GCP_VARIABLES);
const contextTM: GCloudArguments = _getContextInstance(primaryContext, 'TM');
const contextNode: GCloudArguments = _getContextInstance(primaryContext, 'WS'); // 'WS'
const context = Object.assign(primaryContext, {TM_INSTANCE_VARIABLES: contextTM, NODE_INSTANCE_VARIABLES: contextNode});

async.waterfall([
  async.constant(context),
  createProject,
  createRedis,
  reserveInternalIP,
  buildImageTM,
  buildImageNode,
  pushImageTM,
  pushImageNode,
  createTM,
  promoteExternalIP,
  createCluster,
  createPods,
  createReplicas,
  setupAutoscale,
  setupLoadbalancer
], function(error, result) {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
});

export function _getContextInstance(externalContext: any, MACHINE_SUFFIX: string = 'WS'): GCloudArguments {
  const {
    PROJECT_ID, 
    TAG, 
    DEFAULT_IMAGE_NAME_SUFFIXES, 
    DEFAULT_MACHINE_TYPES,
    COMPUTED_VARIABLES: { NODE_ENV, ENVIRONMENT, VERSION, VERSION_TAG }
  } = externalContext;

  const DEFAULT_PORTS = externalContext[`DEFAULT_${MACHINE_SUFFIX}_PORTS`];
  const IMAGE_NAME_SUFFIX = DEFAULT_IMAGE_NAME_SUFFIXES[MACHINE_SUFFIX];
  const IMAGE_NAME = `ws${ENVIRONMENT}${IMAGE_NAME_SUFFIX}`;
  const IMAGE_URL = `gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${VERSION_TAG}`;

  return {
    IMAGE_NAME,
    IMAGE_URL,
    TAG: VERSION_TAG,
    PORT: DEFAULT_PORTS[NODE_ENV],
    NODE_NAME: `${ENVIRONMENT}-${IMAGE_NAME_SUFFIX}-${VERSION}`,
    MACHINE_TYPE: DEFAULT_MACHINE_TYPES[MACHINE_SUFFIX],
    MACHINE_SUFFIX
  }
}