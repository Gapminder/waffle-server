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
    ZONE,
    PROJECT_ID,
    REDIS_INSTANCE_NAME
  } = externalContext;

  const command = `gcloud beta compute instances delete ${REDIS_INSTANCE_NAME} \
    --delete-disks=all --zone=${ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function releaseRedisInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REGION_REDIS,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-redis-address-${VERSION}`;
  //fixme: REGION
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${REGION_REDIS} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeMongo(externalContext: any, cb: Function): void {
  const {
    ZONE,
    PROJECT_ID,
    MONGO_INSTANCE_NAME
  } = externalContext;

  const command = `gcloud beta compute instances delete ${MONGO_INSTANCE_NAME} \
    --delete-disks=all --zone=${ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function releaseMongoInternalIP(externalContext: any, cb: Function): void {
  const {
    PROJECT_ID,
    REGION_MONGO,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-mongo-address-${VERSION}`;
  //fixme: REGION
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${REGION_MONGO} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};
  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeTM(externalContext: any, cb: Function): void {
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
    REGION_TM,
    COMPUTED_VARIABLES: {
      ENVIRONMENT,
      VERSION
    }
  } = externalContext;

  const ADDRESS_NAME = `${ENVIRONMENT}-tm-address-${VERSION}`;
  //fixme: REGION
  const command = `gcloud compute addresses delete ${ADDRESS_NAME} --region=${REGION_TM} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}

export function removeCluster(externalContext: any, cb: Function): void {
  const { PROJECT_ID, ZONE, CLUSTER_NAME } = externalContext;

  const command = `gcloud container clusters delete ${CLUSTER_NAME} --zone=${ZONE} --project=${PROJECT_ID} --quiet`;
  const options: ExecOptions = {};

  return runShellCommand(command, options, (error: string) => cb(error, externalContext));
}
