/* tslint:disable:no-console no-unused-expression */

import * as _ from 'lodash';
import * as shell from 'shelljs';
import { e2eEnv } from './e2e.env';
import * as supertest from 'supertest';
import { expect } from 'chai';
import * as URLON from 'urlon';
import { logger } from '../ws.config/log';
import * as async from 'async';
import {ChildProcess} from 'child_process';
import {ExecOutputReturnValue} from 'shelljs';
import { CallbackHandler } from 'supertest';

const wsApi = supertest(e2eEnv.wsUrl);

const START_WAFFLE_SERVER = (process.env.START_WAFFLE_SERVER !== 'false');
const DROP_MONGO_DATABASE = (process.env.DROP_MONGO_DATABASE !== 'false');

export {
  dropMongoDb,
  stopWaffleServer,
  startWaffleServer,
  setUpEnvironmentVariables,
  sendDdfqlRequestAndVerifyResponse,
  sendDdfqlRequestAndExpectError
};

function sendDdfqlRequest(ddfql: any, onResponseReceived: CallbackHandler): void {
  const encodedDataset = _.has(ddfql, 'dataset') ? { dataset: encodeURIComponent(ddfql.dataset) } : {};
  ddfql = Object.assign({}, ddfql, { force: true }, encodedDataset);
  // ddfql = Object.assign({}, ddfql, encodedDataset);

  // console.log(`/api/ddf/ql?${URLON.stringify(ddfql)}`);
  /*console.log(`encodedDataset`, encodedDataset);
  console.log(e2eEnv.datasetName);*/

  // wsApi.get(`/api/ddf/ml-ql?${URLON.stringify(ddfql)}`)
  wsApi.get(`/api/ddf/ql?${URLON.stringify(ddfql)}`)
  // Here is alternative way of sending ddfql - via encoded JSON
  // wsApi.get(`/api/ddf/ql?query=${encodeURIComponent(JSON.stringify(ddfql))}`)
    .set('Accept', 'application/json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end(onResponseReceived);
}

function startWaffleServer(): void {
  setUpEnvironmentVariables();
  if (START_WAFFLE_SERVER) {
    shell.exec(`./node_modules/.bin/pm2 restart ecosystem.config.js > /dev/null`);

    if (shell.error()) {
      logger.error('startWaffleServer error:', shell.error());
      shell.exec(`./node_modules/.bin/pm2 list`);
    }
  }
}

function stopWaffleServer(done: Function): void {
  if (START_WAFFLE_SERVER) {
    shell.exec(`node -v`);
    shell.exec(`./node_modules/.bin/pm2 stop all > /dev/null && ./node_modules/.bin/pm2 delete all > /dev/null`);

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
  shell.env['PORT'] = e2eEnv.wsPort;
  shell.env['INFLUXDB_HOST'] = e2eEnv.influxdb_host;
  shell.env['INFLUXDB_PORT'] = e2eEnv.influxdb_port;
  shell.env['INFLUXDB_USER'] = e2eEnv.influxdb_user;
  shell.env['INFLUXDB_PASSWORD'] = e2eEnv.influxdb_password;
  shell.env['INFLUXDB_DATABASE_NAME'] = e2eEnv.influxdb_database_name;
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
