import test from 'ava';
import ddfConceptsJsonFormat from './ws_ddf_test_fixtures_first_commit/concepts-without-params-json.json';
import ddfConceptsWsJsonFormat from './ws_ddf_test_fixtures_first_commit/concepts-without-params-wsjson.json';
import ddfConceptsDdfJsonFormat from './ws_ddf_test_fixtures_first_commit/concepts-without-params-ddfjson.json';

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
  console.log('Set default first commit');

  return setDefaultSecondCommitByCLI(t.end);
});

test.cb('Check GET request: concepts with select format=json, when default dataset was set', t => {
  t.plan(1);

  api.get('/api/ddf/concepts?format=json')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsJsonFormat);

      t.end();
    })
});

test.cb('Check GET request: concepts headers with select format=wsJson, when default dataset was set', t => {
  t.plan(3);

  api.get('/api/ddf/concepts?format=wsJson')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsWsJsonFormat);
      t.deepEqual(res.body.headers, ddfConceptsWsJsonFormat.headers);
      t.deepEqual(res.body.rows, ddfConceptsWsJsonFormat.rows);

      t.end();
    })
});

test.cb('Check GET request: concepts with select format=ddfJson, when default dataset was set', t => {
  t.plan(5);

  api.get('/api/ddf/concepts?format=ddfJson')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsDdfJsonFormat);
      t.deepEqual(res.body.concepts.values, ddfConceptsDdfJsonFormat.concepts.values);
      t.deepEqual(res.body.concepts.properties, ddfConceptsDdfJsonFormat.concepts.properties);
      t.deepEqual(res.body.concepts.propertyValues, ddfConceptsDdfJsonFormat.concepts.propertyValues);
      t.deepEqual(res.body.concepts.rows, ddfConceptsDdfJsonFormat.concepts.rows);

      t.end();
    })
});
