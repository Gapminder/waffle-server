import * as _ from 'lodash';
import * as shell from 'shelljs';
import * as URLON from 'URLON';
import {e2eEnv} from './e2e.env';
import * as supertest from 'supertest';
import {expect} from 'chai';

const wsApi = supertest(e2eEnv.wsUrl);

const START_WAFFLE_SERVER = (process.env.START_WAFFLE_SERVER !== 'false');
const DROP_MONGO_DATABASE = (process.env.DROP_MONGO_DATABASE !== 'false');

export {
  dropMongoDb,
  stopWaffleServer,
  startWaffleServer,
  setUpEnvironmentVariables,
  sendDdfqlRequestAndVerifyResponse
};

function sendDdfqlRequest(ddfql, onResponseReceived) {
  ddfql.force = true;
  return wsApi.get(`/api/ddf/ql?${URLON.stringify(ddfql)}`)
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(onResponseReceived);
}

function startWaffleServer() {
  setUpEnvironmentVariables();
  if (START_WAFFLE_SERVER) {
    shell.exec(`./node_modules/.bin/forever start -t -o /dev/null -l /dev/null -a --uid "${e2eEnv.wsUid}" ./server.js`);
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

function sendDdfqlRequestAndVerifyResponse(ddfql, expectedResponse, done) {
  sendDdfqlRequest(ddfql, (error, response) => {
    const actualRows = _.sortBy(response.body.rows);
    const expectedRows = _.sortBy(expectedResponse.rows);

    expect(actualRows).to.deep.equal(expectedRows);
    expect(response.body.headers).to.deep.equal(expectedResponse.headers);

    done();
  });
}
