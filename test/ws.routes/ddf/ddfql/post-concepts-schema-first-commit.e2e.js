'use strict';

const ddfConceptSchemaForPostRequest = require('./ws_ddf_test_fixtures_first_commit/concept-schema-wsjson.json');

const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

const expect = require('chai').expect;

const testUtils = require('./cli.utils.js');

before(done => {
  console.log('Set default first commit');
  testUtils.cleanImportAndSetDefaultCommit('803d9b1', done);
});

it('Check POST request: concepts.schema when default dataset was set', done => {

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
      expect(res.body).to.deep.equal(ddfConceptSchemaForPostRequest);
      done();
    });
});
