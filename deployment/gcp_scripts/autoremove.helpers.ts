import * as _ from 'lodash';
import * as async from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';

import { getGCloudArguments, runShellCommand } from './common.helpers';

export function removeImageTM(externalContext: any, cb: Function) {
  const { TM_INSTANCE_VARIABLES: { IMAGE_URL }, PROJECT_ID } = externalContext;

  const command = `gcloud beta container images delete ${IMAGE_URL} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeImageNode(externalContext: any, cb: Function) {
  const { NODE_INSTANCE_VARIABLES: { IMAGE_URL }, PROJECT_ID } = externalContext;

  const command = `gcloud beta container images delete ${IMAGE_URL} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeRedis(externalContext: any, cb: Function) {
  const {
    ZONE,
    PROJECT_ID,
    REDIS_INSTANCE_NAME
  } = externalContext;

  const command = `gcloud beta compute instances delete ${REDIS_INSTANCE_NAME} \
    --delete-disks=all --zone=${ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function releaseInternalIP(externalContext: any, cb: Function) {
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
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${REGION} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeTM(externalContext: any, cb: Function) {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    ZONE,
    PROJECT_ID
  } = externalContext;

  const command = `gcloud beta compute instances delete ${TM_INSTANCE_NAME} \
    --delete-disks=all --zone=${ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function denyHttpTM(externalContext: any, cb: Function) {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    PROJECT_ID,
    FIREWALL_RULE__ALLOW_HTTP
  } = externalContext;

  const command = `gcloud compute firewall-rules delete ${FIREWALL_RULE__ALLOW_HTTP} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));

}

export function releaseExternalIP(externalContext: any, cb: Function) {
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
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${REGION} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeCluster(externalContext: any, cb: Function) {
  const { PROJECT_ID, ZONE, CLUSTER_NAME } = externalContext;

  const command = `gcloud container clusters delete ${CLUSTER_NAME} --zone=${ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
