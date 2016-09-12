import test from 'ava';

import ddfEntitiesForPostRequestJsonFormat from './ws_ddf_test_fixtures_last_commit/entities-with-select-json-format.json';
import ddfEntitiesForPostRequestWsJsonFormat from './ws_ddf_test_fixtures_last_commit/entities-with-select-wsjson-format.json';
import ddfEntitiesForPostRequestDdfJsonFormat from './ws_ddf_test_fixtures_last_commit/entities-with-select-ddfjson-format.json';

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=abb011f LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
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

test.cb('Check POST request: entities with select when default dataset was set', t => {
  t.plan(1);
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
      t.deepEqual(res.body, ddfEntitiesForPostRequestJsonFormat);

      t.end();
    });
});

test.cb('Check POST request: entities with select when default dataset was set', t => {
  t.plan(4);
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
      t.deepEqual(res.body, ddfEntitiesForPostRequestWsJsonFormat);
      t.deepEqual(res.body.headers, ddfEntitiesForPostRequestWsJsonFormat.headers);
      t.deepEqual(res.body.rows, ddfEntitiesForPostRequestWsJsonFormat.rows);
      t.deepEqual(res.body.rows.length, ddfEntitiesForPostRequestWsJsonFormat.rows.length);

      t.end();
    });
});

test.cb('Check POST request: entities with select when default dataset was set', t => {
  t.plan(1);
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
      t.deepEqual(res.body, ddfEntitiesForPostRequestDdfJsonFormat);

      t.end();
    });
});
