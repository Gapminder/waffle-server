'use strict';

import test from 'ava';
import datapointsWithoutQuery from './ws_ddf_test_fixtures_first_commit/datapoints-for-get-without-query.json'

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');


function setDefaultFirstCommitByCLI(onSetDefaultByFirstCommitCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=803d9b1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultByFirstCommitCLIDone(error);

  })
}

test.cb.before(t => {
  console.log('Set default first commit');

  return setDefaultFirstCommitByCLI(t.end);
});

test.cb('Check GET request: for datapoints without query params, when default dataset was set', t => {
  t.plan(1);

  api.get('/api/ddf/datapoints?format=json')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, datapointsWithoutQuery);

      t.end();
    })
});

test.cb('Check GET request: for datapoints without query params, when default dataset was set', t => {
  t.plan(1);

  api.get('/api/ddf/datapoints?format=wsJson')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, datapointsWithoutQuery);

      t.end();
    })
});

test.cb('Check GET request: for datapoints without query params, when default dataset was set', t => {
  t.plan(1);

  api.get('/api/ddf/datapoints?format=ddfJson')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, datapointsWithoutQuery);

      t.end();
    })
});
