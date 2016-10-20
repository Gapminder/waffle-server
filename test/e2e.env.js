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
    init: 'dd40f5b',
    version_1: '8bdd93f',
    version_2: 'ee66b74',
    version_3: '794b7c3'
  }
};
