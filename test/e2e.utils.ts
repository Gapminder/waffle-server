/* tslint:disable:no-console no-unused-expression */

import * as _ from 'lodash';
import * as shell from 'shelljs';
import { e2eEnv } from './e2e.env';
import * as supertest from 'supertest';
import { expect } from 'chai';
import * as URLON from 'urlon';
import { logger } from '../ws.config/log';
import * as fetch from 'node-fetch';
import * as async from 'async';

const wsApi = supertest(e2eEnv.wsUrl);

const START_WAFFLE_SERVER = (process.env.START_WAFFLE_SERVER !== 'false');
const DROP_MONGO_DATABASE = (process.env.DROP_MONGO_DATABASE !== 'false');

export {
  dropMongoDb,
  stopWaffleServer,
  startWaffleServer,
  setUpEnvironmentVariables,
  sendDdfqlRequestAndVerifyResponse,
  sendDdfqlRequestAndExpectError,
  waitForDefaultUser
};

function sendDdfqlRequest(ddfql: any, onResponseReceived: Function): void {
  const encodedDataset = _.has(ddfql, 'dataset') ? { dataset: encodeURIComponent(ddfql.dataset) } : {};
  ddfql = Object.assign({}, ddfql, { force: true }, encodedDataset);
  return wsApi.get(`/api/ddf/ql?${URLON.stringify(ddfql)}`)
  // Here is alternative way of sending ddfql - via encoded JSON
  // return wsApi.get(`/api/ddf/ql?query=${encodeURIComponent(JSON.stringify(ddfql))}`)
    .set('Accept', 'application/json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(onResponseReceived);
}

function startWaffleServer(): void {
  setUpEnvironmentVariables();
  if (START_WAFFLE_SERVER) {
    shell.exec(`./node_modules/.bin/forever start --fifo -o ./logs/forever.output.log -e ./logs/forever.error.log -a --uid "${e2eEnv.wsUid}" server.js`);

    if (shell.error()) {
      logger.error('startWaffleServer error:', shell.error());
      shell.exec(`./node_modules/.bin/forever list`);
    }
  }
}

function stopWaffleServer(done: Function): void {
  if (START_WAFFLE_SERVER) {
    shell.exec(`node -v`);
    const list = shell.exec(`./node_modules/.bin/forever list`);

    if (!_.includes(list.stdout, 'No forever processes running')) {
      shell.exec(`./node_modules/.bin/forever stopall`);
    }

    return done(shell.error());
  }

  return done();
}

function dropMongoDb(done: Function): void {
  if (DROP_MONGO_DATABASE) {
    shell.exec(`mongo ${e2eEnv.mongodb} --eval "db.dropDatabase()"`);

    return done(shell.error());
  }

  return done();
}

function setUpEnvironmentVariables(): void {
  /* tslint:disable:no-string-literal */
  shell.env['MONGODB_URL'] = `mongodb://localhost:27017/${e2eEnv.mongodb}`;
  shell.env['LOG_LEVEL'] = e2eEnv.wsLogLevel;
  shell.env['NODE_ENV'] = e2eEnv.nodeEnv;
  shell.env['DEFAULT_USER_PASSWORD'] = e2eEnv.pass;
  shell.env['INNER_PORT'] = e2eEnv.wsPort;
  shell.env['FOREVER_ROOT'] = __dirname;
  /* tslint:enable:no-string-literal */
}

function sendDdfqlRequestAndVerifyResponse(ddfql: any, expectedResponse: any, done: Function, options: any = {}): void {
  const { sort = true } = options;

  sendDdfqlRequest(ddfql, (error: string, response: any) => {
    expect(error).to.not.exist;

    if (response.body.success === false) {
      logger.error({obj: response});
      throw Error(`DDFQL response contains an error: ${response.body.error || response.body.message}`);
    }

    const actualRows = sort ? _.sortBy(response.body.rows) : response.body.rows;
    const expectedRows = sort ? _.sortBy(expectedResponse.rows) : expectedResponse.rows;

    expect(actualRows).to.deep.equal(expectedRows);
    expect(response.body.headers).to.deep.equal(expectedResponse.headers);

    done();
  });
}

function sendDdfqlRequestAndExpectError(ddfql: any, expectedErrorMessage: string, done: Function): void {
  sendDdfqlRequest(ddfql, (error: any, response: any) => {
    if (response.body.success === false) {
      expect(response.body.error).to.equal(expectedErrorMessage);
      return done();
    }
    throw Error(`Error was expected: "${expectedErrorMessage}". But request returned status success: ${response.body.success}`);
  });
}

function waitForDefaultUser(counter: number = 0, done: Function): void {
  fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({email: e2eEnv.login, password: e2eEnv.pass})
  }).then((response: any) => {
    return response.json();
  }).then((response: any) => {
    if (!response.success) {
      logger.warn(response.error);
    }

    if (response.success) {
      logger.info(response, 'Connect to WS successfully');
      return done(null, response.data);
    }

    if (counter > 10000) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += 2000;
      waitForDefaultUser(counter, done);
    }, 2000);
  }).catch((error: any) => {
    if (error) {
      logger.warn(error);
    }

    if (counter > 10000) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += 2000;
      waitForDefaultUser(counter, done);
    }, 2000);
  });
}
