import { Dictionary } from 'lodash';

export interface DockerBuildArguments extends Dictionary<string|number|boolean> {
  PORT: number;
  PROJECT: string;
  REGION: string;
  MACHINE_TYPE: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  ENVIRONMENT: string;
  DEFAULT_USER_PASSWORD: string;
  PATH_TO_DDF_REPOSITORIES: string;
  NEW_RELIC_LICENSE_KEY: string;
  NODE_ENV: string;
  GCP_DEFAULT_REGION: string;
  STACK_NAME: string;
  INFLUXDB_HOST: string;
  INFLUXDB_PORT: number;
  INFLUXDB_DATABASE_NAME: string;
  INFLUXDB_USER: string;
  INFLUXDB_PASSWORD: string;
  MACHINE_SUFFIX: string;
  RELEASE_DATE: string;
  VERSION_TAG: string;
  VERSION: string;
}

export interface GCloudArguments {
  IMAGE_NAME: string;
  NODE_NAME: string;
  PORT: number;
  TAG: string;
  MACHINE_SUFFIX: string;
  IMAGE_URL: string;
}
