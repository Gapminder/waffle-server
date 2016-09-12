'use strict';

import test from 'ava';
//import ddfConceptsJsonFormat from 'ws_ddf_test_fixtures_first_commit/concepts-without-params-json.json';
//import ddfConceptsWsJsonFormat from 'ws_ddf_test_fixtures_first_commit/concepts-without-params-wsjson.json';
//import ddfConceptsDdfJsonFormat from 'ws_ddf_test_fixtures_first_commit/concepts-without-params-ddfjson.json';
//import ddfConceptWithoutSelectForPostRequest from 'ws_ddf_test_fixtures_first_commit/concepts-for-post-without-select.json';
//import ddfDatapointsSelectSgPopulation from 'ws_ddf_test_fixtures_first_commit/ddf--datapoints-sg_populations-only.json';
//import ddfDataointsForPostRequest from 'ws_ddf_test_fixtures_first_commit/ddf--datapoints-with-select-for-post-request.json';
//import ddfConceptWithSelectForPostRequest from 'ws_ddf_test_fixtures_first_commit/concepts-for-post-with-select.json';
//import ddfConceptsSchemas from 'ws_ddf_test_fixtures_first_commit/ddf--concepts-schemas.json';
//import ddfDatapointsSchemas from 'ws_ddf_test_fixtures_first_commit/ddf--datapoints-schemas.json';
//import ddfEntitiesSchemas from 'ws_ddf_test_fixtures_first_commit/ddf--entities-schemas.json';


const _ = require('lodash');
const shell = require('shelljs');
const express = require('express');
const fs = require('fs');
const path = require('path');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');
const async = require('async');

const models = [
  'Concepts',
  'DataPoints',
  'Datasets',
  'DatasetTransactions',
  'Entities'
];

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test');
require('./ws.repository/index.js')();

function cloneCLIRepository(onCLIRepositoryCloned) {
  console.log('Clone cli repository');

  shell.cd('..');

  return fs.stat('waffle-server-import-cli', (error, stats) => {
    shell.rm('-rf', './waffle-server-import-cli');

    if (error) {
      return onCLIRepositoryCloned(error);
    }

    const repoUrl = 'http://github.com/Gapminder/waffle-server-import-cli.git';

    return git().clone(repoUrl, 'waffle-server-import-cli', installNpmModules(onCLIRepositoryCloned));
  });
}

function installNpmModules(onModulesInstalled) {
  return (error) => {
    if (error) {
      return onModulesInstalled(error);
    }
    console.log('** clone completed');
    shell.cd('waffle-server-import-cli');
    shell.exec('npm install', (error) => {
      if (error) {
        return onModulesInstalled(error);
      }

      return runIncrementalUpdate(onModulesInstalled);
    });
  };
}

function runIncrementalUpdate(onIncrementalUpdateDone) {
  const command = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git LOGIN=dev@gapminder.org PASS=123 npm run import`;
  return shell.exec(command, (error) => {
    console.log('** incremental update complete');

    return onIncrementalUpdateDone(error);
  });
}

function cleanDatabase(onDatabaseCleaned) {
  console.log('Clean database');

  return async.forEachLimit(models, 10, (modelName, onCollectionDropped) => {
    return mongoose.model(modelName).collection.drop(error => {
      if (error) {
        console.error(error);
        return onCollectionDropped(error);
      }

      console.log(`** collection ${modelName} was dropped`);

      return onCollectionDropped();
    });
  }, onDatabaseCleaned);
}

test.cb.before(t => {
  console.log('Run cli process before testing');

  //return cleanDatabase((error) => {
  //  if (error) {
  //    return t.end(error);
  //  }

    return cloneCLIRepository(t.end);
  //});
});



test.skip.cb('Check GET request: for datapoints with select=sg_population&key=geo,time, when default dataset was set', t => {
  t.plan(4);
  let datapointsUniqueValues = _.union(ddfDatapointsSelectSgPopulation.sg_population).length;

  api.get('/api/ddf/datapoints?select=sg_population&key=geo,time')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.datapoints.values.length, datapointsUniqueValues);
      t.deepEqual(res.body.datapoints.indicators, ["30"]);
      t.deepEqual(res.body.datapoints.dimensions, ["9", "32"]);
      t.deepEqual(res.body.datapoints.rows.length, ddfDatapointsSelectSgPopulation.sg_population.length);

      t.end();
    })
});

test.skip.cb('Check GET request: for entities with selected format=json, when default dataset was set', t => {
  t.plan(1);
  api.get('/api/ddf/entities?format=json&key=geo&geo.is--country=true')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(_.sortBy(res.body, 'geo'), _.sortBy(ddfEntitiesCountryJsonFormat, 'geo'));

      t.end();
    })
});

test.skip.cb('Check GET request: for entities with selected format=wsJson, when default dataset was set', t => {
  t.plan(2);
  api.get('/api/ddf/entities?format=wsJson&key=geo&geo.is--country=true')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.headers, ddfEntitiesCountryWsJsonFormat.headers);
      t.deepEqual(res.body.rows, ddfEntitiesCountryWsJsonFormat.rows);

      t.end();
    })
});

test.skip.cb('Check GET request: for entities with selected format=ddfJson, when default dataset was set', t => {
  t.plan(5);
  api.get('/api/ddf/entities?format=ddfJson&key=geo&geo.is--country=true')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.values, ddfEntitiesCountryDdfJsonFormat.values);
      t.deepEqual(res.body.properties, ddfEntitiesCountryDdfJsonFormat.properties);
      t.deepEqual(res.body.entities.concepts, ddfEntitiesCountryDdfJsonFormat.entities.concepts);
      t.deepEqual(res.body.propertyValues, ddfEntitiesCountryDdfJsonFormat.propertyValues);
      t.deepEqual(res.body.rows, ddfEntitiesCountryDdfJsonFormat.rows);

      t.end();
    })
});

test.skip.cb('Check POST request: concepts without select when default dataset was set', t => {
  t.plan(4);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({from: "concepts"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfConceptWithoutSelectForPostRequest);
      t.deepEqual(res.body.headers, ddfConceptWithoutSelectForPostRequest.headers);
      t.deepEqual(res.body.rows, ddfConceptWithoutSelectForPostRequest.rows);
      t.deepEqual(res.body.rows.length, ddfConceptWithoutSelectForPostRequest.rows.length);

      t.end();
    });
});

test.skip.cb('Check POST request: concepts with select when default dataset was set', t => {
  t.plan(4);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfConceptWithSelectForPostRequest);
      t.deepEqual(res.body.headers, ddfConceptWithSelectForPostRequest.headers);
      t.deepEqual(res.body.rows, ddfConceptWithSelectForPostRequest.rows);
      t.deepEqual(res.body.rows.length, ddfConceptWithSelectForPostRequest.rows.length);

      t.end();
    });
});

test.skip.cb('Check POST request: datapoints without select when default dataset was set', t => {
  t.plan(2);
  api.post(`/api/ddf/ql`)
    .send({"from": "datapoints"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body.success, false);
      t.deepEqual(res.body.error, 'You didn\'t select any column');

      t.end();
    });
});

test.skip.cb('Check POST request: datapoints with select when default dataset was set', t => {
  t.plan(4);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["geo", "time"],
        "value": [
          "population_total", "life_expectancy_years"
        ]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"geo": "$geo"},
          {"time": "$time"},
          {
            "$or": [
              {"population_total": {"$gt": 100000}, "time": "$time2"},
              {"life_expectancy_years": {"$gt": 30, "$lt": 70}}
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
            "time": {"$lt": "2015"}
          }
        },
        "$time2": {
          "key": "time",
          "where": {
            "time": {"$eq": "1918"}
          }
        }
      }
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfDataointsForPostRequest);
      t.deepEqual(res.body.headers, ddfDataointsForPostRequest.headers);
      t.deepEqual(res.body.rows, ddfDataointsForPostRequest.rows);
      t.deepEqual(res.body.rows.length, ddfDataointsForPostRequest.rows.length);

      t.end();
    });
});



test.skip.cb('Check POST request: for concept.schema', t=> {
  t.plan(4);
  api.post('/api/ddf/ql?format=wsJson')
    .send({
      "select": {
        "key": ["key","value"],
        "value": ["min(value)","max(value)"]
      },
      "from": "concepts.schema"
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsSchemas);
      t.deepEqual(res.body.headers, ddfConceptsSchemas.headers);
      t.deepEqual(res.body.rows, ddfConceptsSchemas.rows);
      t.deepEqual(res.body.rows.length, ddfConceptsSchemas.rows.length);

      t.end();
    })
});

test.skip.cb('Check POST request: for datapoints.schema', t=> {
  t.plan(4);
  api.post('/api/ddf/ql?format=wsJson')
    .send({
      "select": {
        "key": ["key","value"],
        "value": ["min(value)","max(value)"]
      },
      "from": "datapoints.schema"
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfDatapointsSchemas);
      t.deepEqual(res.body.headers, ddfDatapointsSchemas.headers);
      t.deepEqual(res.body.rows, ddfDatapointsSchemas.rows);
      t.deepEqual(res.body.rows.length, ddfDatapointsSchemas.rows.length);

      t.end();
    })
});

test.skip.cb('Check POST request: for entities.schema', t=> {
  t.plan(4);
  api.post('/api/ddf/ql?format=wsJson')
    .send({
      "select": {
        "key": ["key","value"],
        "value": ["min(value)","max(value)"]
      },
      "from": "entities.schema"
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfEntitiesSchemas);
      t.deepEqual(res.body.headers, ddfEntitiesSchemas.headers);
      t.deepEqual(res.body.rows, ddfEntitiesSchemas.rows);
      t.deepEqual(res.body.rows.length, ddfEntitiesSchemas.rows.length);

      t.end();
    })
});



//test.cb.after('clean test database', t => {
//  return cleanDatabase(t.end);
//});
