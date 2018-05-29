import { constants } from '../ws.utils/constants';

/* tslint:disable:no-invalid-this */
const e2eEnv = {
  pass: '123',
  login: constants.DEFAULT_USER_EMAIL,
  mongodb: 'ws_ddf_test',
  nodeEnv: 'local',
  influxdb_host: process.env.INFLUXDB_HOST,
  influxdb_port: process.env.INFLUXDB_PORT,
  influxdb_user: process.env.INFLUXDB_USER,
  influxdb_password: process.env.INFLUXDB_PASSWORD,
  influxdb_database_name: process.env.INFLUXDB_DATABASE_NAME,
  wsPort: '8081',
  wsHost: 'localhost',
  get wsHostUrl(): string {
    return `http://${this.wsHost}`;
  },
  get wsUrl(): string {
    return `http://${this.wsHost}:${this.wsPort}`;
  },
  wsUid: 'ws-e2e',
  wsLogLevel: 'debug',
  repo: 'git@github.com:VS-work/ddf--ws-testing.git',
  repo2: 'git@github.com:VS-work/ddf--ws-testing.git#master-twin-for-e2e',
  datasetName: 'VS-work/ddf--ws-testing',
  datasetName2: 'VS-work/ddf--ws-testing#master-twin-for-e2e'
};
/* tslint:enable:no-invalid-this */

export { e2eEnv };
