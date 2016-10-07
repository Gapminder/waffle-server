'use strict';

const ddfConceptWithSelectForPostRequest = require('./ws_ddf_test_fixtures_first_commit/concepts-for-post-with-select.json');

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

const expect = require('chai').expect;

const testUtils = require('./cli.utils.js');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=803d9b1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultSecondCommitByCLIDone(error);
  });
}

before(() => {
  console.log('Set default first commit');

  return setDefaultSecondCommitByCLI(done);
});

it('Check POST request: entities with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts",
      "where": {
        "$and": [
          {"concept_type": {"$not": "entity_set"}},
          {"color.palette._default": {"$exists": true}}
        ]
      }
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(ddfConceptWithSelectForPostRequest);


      done();
    });
});
