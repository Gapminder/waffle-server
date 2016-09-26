'use strict';

const ddfEntitiesForPostRequestJsonFormat = require('./ws_ddf_test_fixtures_second_commit/entities-with-select-json-format.json');
const ddfEntitiesForPostRequestWsJsonFormat = require('./ws_ddf_test_fixtures_second_commit/entities-with-select-wsjson-format.json');
const ddfEntitiesForPostRequestDdfJsonFormat = require('./ws_ddf_test_fixtures_second_commit/entities-with-select-ddfjson-format.json');

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

it('Check POST request: entities with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=json`)
    .send({
      "select": {
        "key": ["geo"],
        "value": [
          "name","_default","world_4region"
        ]
      },
      "from": "entities",
      "where": {
        "$and": [
          {"is--country": true},
          {"landlocked": "$landlocked"},
          {
            "$nor": [
              {"latitude": {"$gt": -10,"$lt": 1 }, "world_4region": "$world_4region"},
              {"longitude": {"$gt": 30, "$lt": 70}, "main_religion": "$main_religion_2008"}
            ]
          }
        ]
      },
      "join": {
        "$landlocked": {
          "key": "landlocked",
          "where": {
            "$or": [
              {"gwid": "i271"},
              {"name": "Coastline"}
            ]
          }
        },
        "$world_4region": {
          "key": "world_4region",
          "where": {
            "color": "#ff5872"
          }
        },
        "$main_religion_2008": {
          "key": "main_religion_2008",
          "where": {
            "main_religion_2008": {"$nin": ["eastern_religions"]}
          }
        }
      }
    })
    .set('Accept', 'application/x-json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(ddfEntitiesForPostRequestJsonFormat);

      done();
    });
});

it('Check POST request: entities with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["geo"],
        "value": [
          "name","_default","world_4region"
        ]
      },
      "from": "entities",
      "where": {
        "$and": [
          {"is--country": true},
          {"landlocked": "$landlocked"},
          {
            "$nor": [
              {"latitude": {"$gt": -10,"$lt": 1 }, "world_4region": "$world_4region"},
              {"longitude": {"$gt": 30, "$lt": 70}, "main_religion": "$main_religion_2008"}
            ]
          }
        ]
      },
      "join": {
        "$landlocked": {
          "key": "landlocked",
          "where": {
            "$or": [
              {"gwid": "i271"},
              {"name": "Coastline"}
            ]
          }
        },
        "$world_4region": {
          "key": "world_4region",
          "where": {
            "color": "#ff5872"
          }
        },
        "$main_religion_2008": {
          "key": "main_religion_2008",
          "where": {
            "main_religion_2008": {"$nin": ["eastern_religions"]}
          }
        }
      }
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(ddfEntitiesForPostRequestWsJsonFormat);
      expect(res.body.headers).to.deep.equal(ddfEntitiesForPostRequestWsJsonFormat.headers);
      expect(res.body.rows).to.deep.equal(ddfEntitiesForPostRequestWsJsonFormat.rows);
      expect(res.body.rows.length).to.deep.equal(ddfEntitiesForPostRequestWsJsonFormat.rows.length);

      done();
    });
});

it('Check POST request: entities with select when default dataset was set', done => {

  api.post(`/api/ddf/ql?format=ddfJson`)
    .send({
      "select": {
        "key": ["geo"],
        "value": [
          "name","_default","world_4region"
        ]
      },
      "from": "entities",
      "where": {
        "$and": [
          {"is--country": true},
          {"landlocked": "$landlocked"},
          {
            "$nor": [
              {"latitude": {"$gt": -10,"$lt": 1 }, "world_4region": "$world_4region"},
              {"longitude": {"$gt": 30, "$lt": 70}, "main_religion": "$main_religion_2008"}
            ]
          }
        ]
      },
      "join": {
        "$landlocked": {
          "key": "landlocked",
          "where": {
            "$or": [
              {"gwid": "i271"},
              {"name": "Coastline"}
            ]
          }
        },
        "$world_4region": {
          "key": "world_4region",
          "where": {
            "color": "#ff5872"
          }
        },
        "$main_religion_2008": {
          "key": "main_religion_2008",
          "where": {
            "main_religion_2008": {"$nin": ["eastern_religions"]}
          }
        }
      }
    })
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      expect(res.body).to.deep.equal(ddfEntitiesForPostRequestDdfJsonFormat);

      done();
    });
});
