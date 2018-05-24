import * as _ from 'lodash';
import * as async from 'async';
import { ExecOptions, ExecOutputReturnValue } from 'shelljs';

import { getGCloudArguments, runShellCommand } from './common.helpers';

export function removeImageTM(externalContext: any, cb: Function): void {
  const { TM_INSTANCE_VARIABLES: { IMAGE_URL }, PROJECT_ID } = externalContext;

  const command = `gcloud beta container images delete ${IMAGE_URL} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeImageNode(externalContext: any, cb: Function): void {
  const { NODE_INSTANCE_VARIABLES: { IMAGE_URL }, PROJECT_ID } = externalContext;

  const command = `gcloud beta container images delete ${IMAGE_URL} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeRedis(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_INSTANCE_NAME,
    REDIS_ZONE
  } = externalContext;

  const command = `gcloud beta compute instances delete ${REDIS_INSTANCE_NAME} \
    --delete-disks=all --zone=${REDIS_ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function releaseRedisInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REDIS_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-redis-address-${VERSION}`;
  //fixme: REGION
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${REDIS_REGION} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeTM(externalContext: any, cb: Function): void {
  const {
    TM_INSTANCE_VARIABLES: {
      NODE_NAME: TM_INSTANCE_NAME
    },
    TM_ZONE,
    PROJECT_ID
  } = externalContext;

  const command = `gcloud beta compute instances delete ${TM_INSTANCE_NAME} \
    --delete-disks=all --zone=${TM_ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function denyHttpTM(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    FIREWALL_RULE__ALLOW_HTTP
  } = externalContext;

  const command = `gcloud compute firewall-rules delete ${FIREWALL_RULE__ALLOW_HTTP} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));

}

export function releaseExternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    TM_REGION,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-tm-address-${VERSION}`;
  //fixme: REGION
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${TM_REGION} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeCluster(externalContext: any, cb: Function): void {
  const { PROJECT_ID, LB_ZONE, CLUSTER_NAME } = externalContext;

  const command = `gcloud container clusters delete ${CLUSTER_NAME} --zone=${LB_ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
