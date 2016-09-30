import test from 'ava';

import datapointsWithoutSelect from './ws_ddf_test_fixtures_last_commit/datapoints-for-post-without-select.json';

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=abb011f LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultSecondCommitByCLIDone(error);
  })
}

test.cb.before(t => {
  console.log('Set default first commit');

  return setDefaultSecondCommitByCLI(t.end);
});

test.cb('Check POST request: datapoints with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=json`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, datapointsWithoutSelect);


      t.end();
    });
});

test.cb('Check POST request: datapoints with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, datapointsWithoutSelect);


      t.end();
    });
});

test.cb('Check POST request: datapoints with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=ddfJson`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, datapointsWithoutSelect);


      t.end();
    });
});
