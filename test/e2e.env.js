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
  repo: 'git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git'
};
