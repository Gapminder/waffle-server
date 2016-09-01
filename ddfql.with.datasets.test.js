'use strict';

import test from 'ava';
import ddfConceptsJsonFormat from './ws.ddf.test.json/concepts.test.json';
import ddfConceptsWsJsonFormat from './ws.ddf.test.json/concepts.wsjson.format.test.json'
import ddfConceptsDdfJsonFormat from './ws.ddf.test.json/concepts.ddfjson.format.test.json'


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
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
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

test.cb('Check GET request concepts with select format=json, when selected by default dataset', t => {
  t.plan(1);

  api.get('/api/ddf/concepts?format=json')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsJsonFormat);
      t.end();
    })
});

test.cb('Check GET request concepts headers with select format=wsJson, when selected by default dataset', t => {
  t.plan(2);

  const conceptsHeaders = [
    "description",
    "unit",
    "drill_up",
    "scales",
    "color",
    "indicator_url",
    "domain",
    "concept_type",
    "name",
    "concept"
  ];

  api.get('/api/ddf/concepts?format=wsJson')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsWsJsonFormat);
      t.deepEqual(res.body.headers, conceptsHeaders);

      t.end();
    })
});

test.cb('Check GET request concepts with select format=ddfJson, when selected by default dataset', t => {
  t.plan(3);

  const conceptsValues = [
    "code",
    "color",
    "country",
    "description",
    "domain",
    "drill_up",
    "epidemic_affected_annual_number",
    "forest_products_removal_total_dollar",
    "gapminder_list",
    "geo",
    "geographic_regions",
    "global",
    "god_id",
    "gwid",
    "hourly_compensation_us",
    "income_per_person_gdppercapita_ppp_inflation_adjusted",
    "indicator_url",
    "landlocked",
    "latitude",
    "life_expectancy_years",
    "longitude",
    "main_religion_2008",
    "name",
    "name_long",
    "name_short",
    "number",
    "population_total",
    "scales",
    "sg_gdp_p_cap_const_ppp2011_dollar",
    "sg_gini",
    "sg_population",
    "shape_lores_svg",
    "time",
    "unit",
    "world_4region"
  ];

  const conceptsProperties = [
    "color",
    "concept",
    "concept_type",
    "description",
    "domain",
    "drill_up",
    "indicator_url",
    "name",
    "scales",
    "unit"
  ];
  api.get('/api/ddf/concepts?format=ddfJson')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body, ddfConceptsDdfJsonFormat);
      t.deepEqual(res.body.concepts.values, conceptsValues);
      t.deepEqual(res.body.concepts.properties, conceptsProperties);

      t.end();
    })
});

//test.cb.after('clean test database', t => {
//  return cleanDatabase(t.end);
//});
