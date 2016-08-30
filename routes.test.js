'use strict';

import test from 'ava';

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

    return onIncrementalUpdateDone(error);
  });
}

function setDefaultByCLI(onSetDefaultByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    //return onSetDefaultByCLIDone(error);
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

test.cb('check GET requests: concepts, entities, datapoints with parameter `format=json`, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities'];
  t.plan(routes.length);

  async.forEach(routes, (route, fecb) => {
    api.get(`/api/ddf/${route}?format=json`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      })
  }, (error) => {
    t.end(error);
  });
});

test.cb('check GET requests: concepts, entities, datapoints with parameter `format=wsJson`, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities'];
  t.plan(routes.length);

  async.forEach(routes, (route, fecb) => {
    api.get(`/api/ddf/${route}?format=wsJson`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      });
  }, (error) => {
    t.end(error);
  })
});

test.cb('check GET requests: concepts, entities, datapoints with parameter `format=ddfJson`, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities'];
  t.plan(routes.length);

  async.forEach(routes, (route, fecb) => {
    api.get(`/api/ddf/${route}?format=ddfJson`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      })
  }, (error) => {
    t.end(error);
  });
});

//test.cb('Select concepts on WS endpoint without using query params and having only one version of dataset (right after importing)', t => {
// api.post(`/api/ddf/ql`)
//    .send({})
//    .set('Accept', 'application/json')
//    .expect(200)
//   .expect('Content-Type', /application\/json/)
//    .end((error, res) => {
//      //t.ifError(error);
//      if (error) return t.end(error);
//      t.deepEqual(res.body, 'Default dataset was not set');
//
//      t.end();
//
//    })
//});

//test.cb('Select concepts on WS endpoint without using query params and having only one version of dataset (right after importing)', t => {
//  api.get('/api/ddf/concepts?format=wsJson')
//    .set('Accept', 'application/json')
//    .expect(200)
//    .end((err, res) => {
//      //console.log(res.body);
//      t.deepEqual(res.body, undefined);
//      //t.is(res.body).to.be.not.empty;
//      //t.is(res.body).to.have.property('concepts');
//      //t.is(res.body.concepts).to.have.property('values');
//      //t.is(res.body.concepts).to.have.property('properties');
//      //t.is(res.body.concepts).to.have.property('propertyValues');
//      //t.is(res.body.concepts).to.have.property('rows');
//      //t.is(res.body.concepts.values).to.include.members(expectedValues);
//      t.end();
//    })
//});

//test.cb.after('clean test database', t => {
//  return cleanDatabase(t.end);
//});
