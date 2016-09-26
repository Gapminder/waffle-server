'use strict';

const datapointsWithoutSelect = require('./ws_ddf_test_fixtures_second_commit/datapoints-for-post-without-select.json');

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

const expect = require('chai').expect;

const testUtils = require('./cli.utils.js');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=dc655e1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultSecondCommitByCLIDone(error);
  });
}

before(() => {
  console.log('Set default second commit');

  return setDefaultSecondCommitByCLI(done);
});

it('Check POST request: datapoints with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=json`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(datapointsWithoutSelect);


      done();
    });
});

it('Check POST request: datapoints with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=wsJson`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(datapointsWithoutSelect);


      done();
    });
});

it('Check POST request: datapoints with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=ddfJson`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(datapointsWithoutSelect);


      done();
    });
});
