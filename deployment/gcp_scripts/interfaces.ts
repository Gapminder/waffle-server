
export interface DockerBuildArguments extends Dictionary<string|number|boolean> {
  PORT: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  MONGODB_URL: string;
  DEFAULT_USER_PASSWORD: string;
  PATH_TO_DDF_REPOSITORIES: string;
  NEW_RELIC_LICENSE_KEY: string;
  NODE_ENV: string;
  LOGS_SYNC_DISABLED: boolean;
  GCP_DEFAULT_REGION: string;
  STACK_NAME: string;
  INFLUXDB_HOST: string;
  INFLUXDB_DATABASE_NAME: string;
  INFLUXDB_USER: string;
  INFLUXDB_PASSWORD: string;
  MACHINE_SUFFIX: string;
  RELEASE_DATE: string;
  WAFFLE_SERVER_VERSION: string;
}

export interface DockerBuildArgumentsTM extends DockerBuildArguments {
  THRASHING_MACHINE: boolean;
}

export interface GCloudArguments {
  IMAGE_NAME: string;
  NODE_NAME: string;
  PORT: number;
  TAG: string;
  MACHINE_SUFFIX: string;
  IMAGE_URL: string;
}
