import * as _ from 'lodash';
import * as async from 'async';
import * as semverRegex from 'semver-regex';
import { GCloudArguments } from './interfaces';
import { getContextInstance } from './common.helpers';
import { logger } from '../ws.config/log';
import { DEFAULT_CONFIG } from './deployment_config.default';

import {
  setDefaultProject, setDefaultUser, setupAPIs, linkProjectToBilling
} from './autodeploy.helpers';

import {
  denyHttpTM, releaseExternalIP, releaseRedisInternalIP, removeCluster,
  removeImageNode, removeImageTM, removeRedis, removeTM
} from './autoremove.helpers';

// Default variables
const {
  DEFAULT_NODE_ENV,
  DEFAULT_PATH_TO_CONFIG_FILE,
  DEFAULT_ENVIRONMENTS,
  DEFAULT_TM_PORTS,
  DEFAULT_WS_PORTS,
  DEFAULT_MACHINE_TYPES,
  DEFAULT_IMAGE_NAME_SUFFIXES,
  DEFAULT_MACHINE_SUFFIXES,
  DEFAULT_GCP_VARIABLES,
  DEFAULT_GCP_API
} = DEFAULT_CONFIG;

export function run(): Promise<string | null> {

  // Computed variables
  const _VERSION = process.env.VERSION;

  if (_.isNil(_VERSION)) {
    logger.error('Variable VERSION was not defined!');
    process.exit(2);
  }

  if (_.isString(_VERSION) && !semverRegex().test(_VERSION)) {
    logger.error('Variable VERSION should match semver!');
    process.exit(3);
  }

  logger.info(`You give '${_VERSION}' version. Are you sure you want to delete it?`);

  const NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;
  const ENVIRONMENT = DEFAULT_ENVIRONMENTS[NODE_ENV] || NODE_ENV;
  const VERSION_TAG = semverRegex().exec(process.env.VERSION)[0];
  const VERSION = VERSION_TAG.replace(/\./g, '-');
  const STATIC_VARIABLES = require(`${DEFAULT_PATH_TO_CONFIG_FILE}${ENVIRONMENT}.json`);
  const DEFAULT_REGION = STATIC_VARIABLES.REGION || DEFAULT_GCP_VARIABLES.DEFAULT_REGION;
  const REDIS_REGION = STATIC_VARIABLES.REDIS_REGION || DEFAULT_REGION;
  const TM_REGION = STATIC_VARIABLES.TM_REGION || DEFAULT_REGION;
  const LB_REGION = STATIC_VARIABLES.LB_REGION || DEFAULT_REGION;

  logger.info(`Parsed version: ${VERSION_TAG}`);

  const COMPUTED_VARIABLES = Object.assign({
    NODE_ENV,
    ENVIRONMENT,
    STACK_NAME: `${ENVIRONMENT}-stack-${VERSION}`,
    RELEASE_DATE: (new Date()).toISOString(),
    VERSION,
    VERSION_TAG,
  }, STATIC_VARIABLES);

  // gcloud variables

  const GCP_VARIABLES = Object.assign({
    PROJECT_ID: `${ENVIRONMENT}-${STATIC_VARIABLES.DEFAULT_PROJECT_NAME}`,
    PROJECT_LABELS: `environment=${ENVIRONMENT}`,
    CLUSTER_NAME: `${ENVIRONMENT}-cluster-${VERSION}`,
    NAME_SPACE_NODE: `${ENVIRONMENT}-namespace-${VERSION}`,
    REDIS_INSTANCE_NAME: `${ENVIRONMENT}-redis-${VERSION}`,
    REPLICAS_NAME: `${ENVIRONMENT}-replicas-${VERSION}`,
    LOAD_BALANCER_NAME: `${ENVIRONMENT}-lb-${VERSION}`,
    FIREWALL_RULE__ALLOW_HTTP: `${ENVIRONMENT}-allow-http-${VERSION}`,

    REGION: DEFAULT_REGION,
    REDIS_REGION,
    TM_REGION,
    LB_REGION,

    ZONE: `${ DEFAULT_REGION }-c`,
    REDIS_ZONE: `${ REDIS_REGION }-c`,
    TM_ZONE: `${ TM_REGION }-c`,
    LB_ZONE: `${ LB_REGION }-c`
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

  return new Promise((resolve: Function, reject: Function) => {
    async.waterfall([
      async.constant(context),
      setDefaultUser,
      setDefaultProject,
      async.apply(setupAPIs, ['cloudbilling.googleapis.com'], {action: 'enable'}),
      linkProjectToBilling,
      async.apply(setupAPIs, DEFAULT_GCP_API, {action: 'enable'}),
      removeCluster,
      releaseExternalIP,
      denyHttpTM,
      removeTM,
      releaseRedisInternalIP,
      removeRedis,
      removeImageNode,
      removeImageTM,
      // async.apply(setupAPIs, [...DEFAULT_GCP_API, 'cloudbilling.googleapis.com'], {action: 'disable'}),
    ], function (error: string, result: any): void {
      if (error) {
        logger.error(error);
        return reject(error);
      }

      return resolve();
    });
  });
}

