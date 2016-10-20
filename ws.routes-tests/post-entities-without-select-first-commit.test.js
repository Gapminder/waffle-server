'use strict';

import test from 'ava';
import ddfEntitiesWithoutSelectForPostRequest from './ws_ddf_test_fixtures_first_commit/entities-for-post-without-select.json';


const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=803d9b1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
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
  t.plan(1);
  api.post(`/api/ddf/ql?format=json`)
    .send({from: "concepts"})
    .set('Accept', 'application/x-json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfEntitiesWithoutSelectForPostRequest);


      t.end();
    });
});

test.cb('Check POST request: concepts without select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({from: "concepts"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfEntitiesWithoutSelectForPostRequest);


      t.end();
    });
});

test.cb('Check POST request: concepts without select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=ddfJson`)
    .send({from: "concepts"})
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfEntitiesWithoutSelectForPostRequest);


      t.end();
    });
});
