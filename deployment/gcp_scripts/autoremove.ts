import * as _ from 'lodash';
import * as async from 'async';
import * as semverRegex from 'semver-regex';

import {
  setDefaultProject, setDefaultUser, setupAPIs, linkProjectToBilling
} from './autodeploy.helpers';
import {
  denyHttpTM, releaseExternalIP, releaseRedisInternalIP, releaseMongoInternalIP, removeCluster,
  removeImageNode, removeImageTM, removeRedis, removeMongo, removeTM
} from './autoremove.helpers';
import { getContextInstance } from './common.helpers';
import { GCloudArguments } from './interfaces';

// Default variables
const {
  DEFAULT_NODE_ENV,
  DEFAULT_ENVIRONMENTS,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS,
  DEFAULT_MACHINE_TYPES,
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_MACHINE_SUFFIXES,
  DEFAULT_GCP_VARIABLES,
  DEFAULT_GCP_API
} = require('./default_deployment_config.json');

// Computed variables
const _VERSION = process.env.VERSION;
console.log(`You give '${_VERSION}' version. Are you sure you want to delete it?`);

if (_.isNil(_VERSION)) {
  console.error('Variable VERSION was not defined!');
  process.exit(2);
}

if (_.isString(_VERSION) && !semverRegex().test(_VERSION)) {
  console.error('Variable VERSION should match semver!');
  process.exit(3);
}

const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;
const ENVIRONMENT = DEFAULT_ENVIRONMENTS[NODE_ENV] || NODE_ENV;
const VERSION_TAG = semverRegex().exec(process.env.VERSION)[0];
const VERSION = VERSION_TAG.replace(/\./g, '-');
const STATIC_VARIABLES = require(`./settings_gapminder_${ENVIRONMENT}.json`);
const DEFAULT_REGION = STATIC_VARIABLES.REGION || DEFAULT_GCP_VARIABLES.DEFAULT_REGION;

console.log(`Parsed version: ${VERSION_TAG}`);

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
  MONGODB_PORT: STATIC_VARIABLES.MONGODB_PORT || DEFAULT_GCP_VARIABLES.DEFAULT_MONGODB_PORT,
  REPLICAS_NAME: `${ENVIRONMENT}-replicas-${VERSION}`,
  LOAD_BALANCER_NAME: `${ENVIRONMENT}-lb-${VERSION}`,
  FIREWALL_RULE__ALLOW_HTTP: `${ENVIRONMENT}-allow-http-${VERSION}`,
  REGION: DEFAULT_REGION,
  ZONE: `${ DEFAULT_REGION }-c`,
  REDIS_ZONE: `${ STATIC_VARIABLES.REDIS_REGION || DEFAULT_REGION }-c`,
  MONGO_ZONE: `${ STATIC_VARIABLES.MONGO_REGION || DEFAULT_REGION }-c`,
  TM_ZONE: `${ STATIC_VARIABLES.TM_REGION || DEFAULT_REGION }-c`,
  LB_ZONE: `${ STATIC_VARIABLES.LB_REGION || DEFAULT_REGION }-c`
}, DEFAULT_GCP_VARIABLES);

const primaryContext = Object.assign({
  COMPUTED_VARIABLES,
  DEFAULT_MACHINE_TYPES,
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS
}, GCP_VARIABLES);
const contextTM: GCloudArguments = getContextInstance(primaryContext, 'TM');
const contextNode: GCloudArguments = getContextInstance(primaryContext, 'WS');
const context = Object.assign(primaryContext, {
  TM_INSTANCE_VARIABLES: contextTM,
  NODE_INSTANCE_VARIABLES: contextNode
});

async.waterfall([
  async.constant(context),
  setDefaultUser,
  setDefaultProject,
  // async.apply(setupAPIs, ['cloudbilling.googleapis.com'], {action: 'enable'}),
  linkProjectToBilling,
  // async.apply(setupAPIs, DEFAULT_GCP_API, {action: 'enable'}),
  removeCluster,
  releaseExternalIP,
  denyHttpTM,
  removeTM,
  releaseMongoInternalIP,
  removeMongo,
  releaseRedisInternalIP,
  removeRedis,
  removeImageNode,
  removeImageTM,
  // async.apply(setupAPIs, [...DEFAULT_GCP_API, 'cloudbilling.googleapis.com'], {action: 'disable'}),  
], function (error: string, result: any) {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
});
