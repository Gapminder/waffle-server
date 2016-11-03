'use strict';

const shell = require('shelljs');
const e2eEnv = require('./e2e.env');
const wsApi = require('supertest')(e2eEnv.wsUrl);

const START_WAFFLE_SERVER = (process.env.START_WAFFLE_SERVER !== 'false');
const DROP_MONGO_DATABASE = (process.env.DROP_MONGO_DATABASE !== 'false');

module.exports = {
  dropMongoDb,
  stopWaffleServer,
  startWaffleServer,
  setUpEnvironmentVariables,
  sendDdfqlRequest
};

function sendDdfqlRequest(ddfql, onResponseReceived) {
  return wsApi.post(`/api/ddf/ql`)
    .send(ddfql)
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(onResponseReceived);
}

function startWaffleServer() {
  setUpEnvironmentVariables();
  if (START_WAFFLE_SERVER) {
    shell.exec(`./node_modules/.bin/forever start -t -o /dev/null -l /dev/null -a --uid "${e2eEnv.wsUid}" server.js`);
  }
}

function stopWaffleServer() {
  if (START_WAFFLE_SERVER) {
    shell.exec(`./node_modules/.bin/forever stop "${e2eEnv.wsUid}"`);
  }
}

function dropMongoDb() {
  if (DROP_MONGO_DATABASE) {
    shell.exec(`mongo ${e2eEnv.mongodb} --eval "db.dropDatabase()"`);
  }
}

function setUpEnvironmentVariables() {
  shell.env['MONGODB_URL'] = `mongodb://localhost:27017/${e2eEnv.mongodb}`;
  shell.env['LOG_LEVEL'] = e2eEnv.wsLogLevel;
  shell.env['NODE_ENV'] = e2eEnv.nodeEnv;
  shell.env['DEFAULT_USER_PASSWORD'] = e2eEnv.pass;
  shell.env['INNER_PORT'] = e2eEnv.wsPort;
}
