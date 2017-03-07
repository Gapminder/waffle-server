import {constants} from '../ws.utils/constants';

/* tslint:disable:no-invalid-this */
const e2eEnv = {
  pass: '123',
  login: constants.DEFAULT_USER_EMAIL,
  mongodb: 'ws_ddf_test',
  nodeEnv: 'local',
  wsPort: '8081',
  wsHost: 'localhost',
  get wsUrl(): string {
    return `http://${this.wsHost}:${this.wsPort}`;
  },
  wsUid: 'ws-e2e',
  wsLogLevel: 'debug',
  repo: 'git@github.com:VS-work/ddf--ws-testing.git'
};
/* tslint:enable:no-invalid-this */

export { e2eEnv };
