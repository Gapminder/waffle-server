import test from 'ava';

import datapointsWithSelectWrongColumn from './ws_ddf_test_fixtures_last_commit/post-datapoints-without-columns.json';

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
  console.log('Set default last commit');

  return setDefaultSecondCommitByCLI(t.end);
});

test.cb('Check POST request: datapoints with select when default dataset was set, but columns aren\'t present in choosen dataset', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=json`)
    .send({
      "select": {
        "key": ["geo", "time"],
        "value": [
          "population", "life_expectancy", "gdp_per_cap", "gov_type"
        ]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"geo": "$geo"},
          {"time": "$time"},
          {
            "$or": [
              {"population": {"$gt": 100000}, "time": "$time2"},
              {"life_expectancy": {"$gt": 30, "$lt": 70}},
              {"gdp_per_cap": {"$gt": 600, "$lt": 500}},
              {"gdp_per_cap": {"$gt": 1000}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          "key": "geo",
          "where": {
            "$and": [
              {"is--country": true},
              {"latitude": {"$lte": 0}}
            ]
          }
        },
        "$time": {
          "key": "time",
          "where": {
            "time": {"$lt": 2015}
          }
        },
        "$time2": {
          "key": "time",
          "where": {
            "time": {"$eq": 1918}
          }
        }
      }})
    .set('Accept', 'application/x-json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, datapointsWithSelectWrongColumn);


      t.end();
    });
});

test.cb('Check POST request: datapoints with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["geo", "time"],
        "value": [
          "population", "life_expectancy", "gdp_per_cap", "gov_type"
        ]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"geo": "$geo"},
          {"time": "$time"},
          {
            "$or": [
              {"population": {"$gt": 100000}, "time": "$time2"},
              {"life_expectancy": {"$gt": 30, "$lt": 70}},
              {"gdp_per_cap": {"$gt": 600, "$lt": 500}},
              {"gdp_per_cap": {"$gt": 1000}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          "key": "geo",
          "where": {
            "$and": [
              {"is--country": true},
              {"latitude": {"$lte": 0}}
            ]
          }
        },
        "$time": {
          "key": "time",
          "where": {
            "time": {"$lt": 2015}
          }
        },
        "$time2": {
          "key": "time",
          "where": {
            "time": {"$eq": 1918}
          }
        }
      }})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, datapointsWithSelectWrongColumn);


      t.end();
    });
});

test.cb('Check POST request: datapoints with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=ddfJson`)
    .send({
      "select": {
        "key": ["geo", "time"],
        "value": [
          "population", "life_expectancy", "gdp_per_cap", "gov_type"
        ]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"geo": "$geo"},
          {"time": "$time"},
          {
            "$or": [
              {"population": {"$gt": 100000}, "time": "$time2"},
              {"life_expectancy": {"$gt": 30, "$lt": 70}},
              {"gdp_per_cap": {"$gt": 600, "$lt": 500}},
              {"gdp_per_cap": {"$gt": 1000}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          "key": "geo",
          "where": {
            "$and": [
              {"is--country": true},
              {"latitude": {"$lte": 0}}
            ]
          }
        },
        "$time": {
          "key": "time",
          "where": {
            "time": {"$lt": 2015}
          }
        },
        "$time2": {
          "key": "time",
          "where": {
            "time": {"$eq": 1918}
          }
        }
      }})
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, datapointsWithSelectWrongColumn);


      t.end();
    });
});
