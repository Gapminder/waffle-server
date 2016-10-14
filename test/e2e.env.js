module.exports = {
  pass: '123',
  login: 'dev@gapminder.org',
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
    init: '3810a5e',
    version_1: '0807fcb',
    version_2: '30a2b3b',
    version_3: '2bc810d'
  }
};
