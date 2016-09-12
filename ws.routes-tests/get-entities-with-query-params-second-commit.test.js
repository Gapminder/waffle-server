import test from 'ava';
import ddfEntitiesCountryJsonFormat from './ws_ddf_test_fixtures_second_commit/entities-for-get-with-params-json-format.json'
import ddfEntitiesCountryWsJsonFormat from './ws_ddf_test_fixtures_second_commit/entities-for-get-with-params-wsjson-format.json';
import ddfEntitiesCountryDdfJsonFormat from './ws_ddf_test_fixtures_second_commit/entities-for-get-with-params-ddfjson-format.json';

const _ = require('lodash');
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

test.cb('Check GET request: for entities with selected format=json, when default dataset was set', t => {
  t.plan(1);
  api.get('/api/ddf/entities?format=json&key=geo&geo.is--country=true')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfEntitiesCountryJsonFormat);

      t.end();
    })
});

test.cb('Check GET request: for entities with selected format=wsJson, when default dataset was set', t => {
  t.plan(4);
  api.get('/api/ddf/entities?format=wsJson&key=geo&geo.is--country=true')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfEntitiesCountryWsJsonFormat);
      t.deepEqual(res.body.headers, ddfEntitiesCountryWsJsonFormat.headers);
      t.deepEqual(res.body.rows, ddfEntitiesCountryWsJsonFormat.rows);
      t.deepEqual(res.body.rows.length, ddfEntitiesCountryWsJsonFormat.rows.length);

      t.end();
    })
});

test.cb('Check GET request: for entities with selected format=ddfJson, when default dataset was set', t => {
  t.plan(1);
  api.get('/api/ddf/entities?format=ddfJson&key=geo&geo.is--country=true')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfEntitiesCountryDdfJsonFormat);

      t.end();
    })
});
