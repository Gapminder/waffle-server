'use strict';

import test from 'ava';
import ddfConceptsJsonFormat from './ws.ddf.test.json/concepts-test.json';
import ddfConceptsWsJsonFormat from './ws.ddf.test.json/concepts-wsjson-format-test.json';
import ddfConceptsDdfJsonFormat from './ws.ddf.test.json/concepts-ddfjson-format-test.json';
import ddfConceptWithoutSelectForPostRequest from './ws.ddf.test.json/ddf--concepts-for-post-request.json';
import ddfDatapointsSelectSgPopulation from './ws.ddf.test.json/ddf--datapoints-sg_populations-only.json';
import ddfEntitiesCountryJsonFormat from './ws.ddf.test.json/ddf--entities-json-format.json'
import ddfEntitiesCountryWsJsonFormat from './ws.ddf.test.json/ddf--entities-wsjson-format.json';
import ddfEntitiesCountryDdfJsonFormat from './ws.ddf.test.json/ddf--entities-ddfjson-format.json';
import ddfEntitiesForPostRequest from './ws.ddf.test.json/ddf--entities-with-select-for-post-request.json';
import ddfDataointsForPostRequest from './ws.ddf.test.json/ddf--datapoints-with-select-for-post-request.json';
import ddfConceptWithSelectForPostRequest from './ws.ddf.test.json/ddf--concept-with-select-for-post-request.json';

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
require('./ws.repository')();

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

    return setDefaultByCLI(onIncrementalUpdateDone);
  });
}

function setDefaultByCLI(onSetDefaultByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=c796f57 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultByCLIDone(error);
  })
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

//test.cb.before(t => {
//  console.log('Run cli process before testing');
//
//  return cleanDatabase((error) => {
//    if (error) {
//      return t.end(error);
//    }
//
//    return cloneCLIRepository(t.end);
//  });
//});

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

test.cb('Check GET request: for datapoints with select=sg_population&key=geo,time, when default dataset was set', t => {
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

test.cb('Check GET request: for entities with selected format=ddfJson, when default dataset was set', t => {
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

test.skip.cb('Check POST request : for concept.schema', t=> {
  //const conceptsSchemaHeaders = ["description", "unit", "drill_up", "scales", "color", "indicator_url", "domian", "concept_type", "name", "concept"];
  t.plan(1);
  api.post('/api/ddf/concepts.schema')
    .send( {"select": {
    "key": ["key","value"],
      "value": ["min(value)","max(value)"]
  },
  "from": "datapoints.schema"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, 35);

      t.end();
    })
});

test.cb('Check POST requests: concepts without select when default dataset was set', t => {
  t.plan(5);
  api.post(`/api/ddf/ql`)
    .send({from: "concepts"})
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfConceptWithoutSelectForPostRequest);
      t.deepEqual(res.body.concepts.values, ddfConceptWithoutSelectForPostRequest.concepts.values);
      t.deepEqual(res.body.concepts.properties, ddfConceptWithoutSelectForPostRequest.concepts.properties);
      t.deepEqual(res.body.concepts.propertyValues, ddfConceptWithoutSelectForPostRequest.concepts.propertyValues);
      t.deepEqual(res.body.concepts.rows, ddfConceptWithoutSelectForPostRequest.concepts.rows);

      t.end();
    });
});

test.cb('Check POST requests: concepts with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts"
    })
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      t.deepEqual(res.body, ddfConceptWithSelectForPostRequest);

      t.end();
    });
});

test.cb('Check POST requests: datapoints without select when default dataset was set', t => {
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

test.cb('Check POST requests: datapoints with select when default dataset was set', t => {
  t.plan(1);
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["geo", "time"],
        "value": [
          "population_total", "sg_population"
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
              {"sg_population": {"$gt": 30, "$lt": 70}}
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

      t.end();
    });
});

test.cb('Check POST requests: entities with select when default dataset was set', t => {
  t.plan(1);
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
      t.deepEqual(res.body, ddfEntitiesForPostRequest);

      t.end();
    });
});


//test.cb.after('clean test database', t => {
//  return cleanDatabase(t.end);
//});
