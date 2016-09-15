import test from 'ava';

import ddfConceptSchemaForPostRequest from './ws_ddf_test_fixtures_second_commit/concept-schema-wsjson.json';

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=dc655e1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultSecondCommitByCLIDone(error);
  })
}

test.cb.before(t => {
  console.log('Set default second commit');

  return setDefaultSecondCommitByCLI(t.end);
});

test.cb('Check POST request: concepts.schema when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["key", "value"],
        "value": ["min(value)", "max(value)"]
      },
      "from": "concepts.schema"
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfConceptSchemaForPostRequest);


      t.end();
    });
});