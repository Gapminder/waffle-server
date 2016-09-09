import test from 'ava';
import ddfEntitiesCountryJsonFormat from './ws_ddf_test_fixtures_second_commit/entities-without-params-json.json'
import ddfEntitiesCountryWsJsonFormat from './ws_ddf_test_fixtures_second_commit/entities-without-params-wsjson.json';
import ddfEntitiesCountryDdfJsonFormat from './ws_ddf_test_fixtures_second_commit/entities-without-params-ddfjson.json';

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=15a90a5 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
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

test.skip.cb('Check GET request: for entities with selected format=json, when default dataset was set', t => {
  t.plan(1);
  api.get('/api/ddf/entities?format=json')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(_.sortBy(res.body, 'geo'), _.sortBy(ddfEntitiesCountryJsonFormat, 'geo'));

      t.end();
    })
});

test.cb('Check GET request: for entities with selected format=wsJson, when default dataset was set', t => {
  t.plan(2);
  api.get('/api/ddf/entities?format=wsJson')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.headers, ddfEntitiesCountryWsJsonFormat.headers);
      t.deepEqual(res.body.rows, ddfEntitiesCountryWsJsonFormat.rows);

      t.end();
    })
});

test.cb('Check GET request: for entities with selected format=ddfJson, when default dataset was set', t => {
  t.plan(5);
  api.get('/api/ddf/entities?format=ddfJson')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.values, ddfEntitiesCountryDdfJsonFormat.values);
      t.deepEqual(res.body.properties, ddfEntitiesCountryDdfJsonFormat.properties);
      t.deepEqual(res.body.concepts, ddfEntitiesCountryDdfJsonFormat.concepts);
      t.deepEqual(res.body.propertyValues, ddfEntitiesCountryDdfJsonFormat.propertyValues);
      t.deepEqual(res.body.rows, ddfEntitiesCountryDdfJsonFormat.rows);

      t.end();
    })
});
