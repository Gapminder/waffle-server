'use strict';

const constants = require('../ws.utils/constants');

module.exports = {
  pass: '123',
  login: constants.DEFAULT_USER_EMAIL,
  mongodb: 'ws_ddf_test',
  nodeEnv: 'local',
  wsPort: '8081',
  wsHost: 'localhost',
  get wsUrl() {
    return `http://${this.wsHost}:${this.wsPort}`;
  },
  wsUid: 'ws-e2e',
  wsLogLevel: 'debug',
  repo: 'git@github.com:VS-work/ddf--ws-testing.git',
  repoCommits: {
    init: '66a50bb',
    version_1: 'c662237',
    version_2: 'adc7feb',
    version_3: '163bd00'
  }
};
