'use strict';

import test from 'ava';
import ddfConceptWithoutSelectForPostRequest from './ws_ddf_test_fixtures_last_commit/concepts-for-post-without-select.json';


const _ = require('lodash');
const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=80d5457 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
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

test.cb('Check POST request: concepts without select when default dataset was set', t => {
  t.plan(4);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({from: "concepts"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfConceptWithoutSelectForPostRequest);
      t.deepEqual(res.body.headers, ddfConceptWithoutSelectForPostRequest.headers);
      t.deepEqual(res.body.rows, ddfConceptWithoutSelectForPostRequest.rows);
      t.deepEqual(res.body.rows.length, ddfConceptWithoutSelectForPostRequest.rows.length);

      t.end();
    });
});
