'use strict';

import test from 'ava';


const express = require('express');
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

test.skip.cb('check GET requests: concepts, entities, datapoints with parameter `format=json`, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities'];
  t.plan(routes.length);

  return async.forEach(routes, (route, fecb) => {
    return api.get(`/api/ddf/${route}?format=json`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      })
  }, (error) => {
    return t.end(error);
  });
});

test.skip.cb('check GET requests: concepts, entities, datapoints with parameter `format=wsJson`, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities'];
  t.plan(routes.length);

  return async.forEach(routes, (route, fecb) => {
    return api.get(`/api/ddf/${route}?format=wsJson`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      });
  }, (error) => {
    return t.end(error);
  });
});

test.skip.cb('check GET requests: concepts, entities, datapoints with parameter `format=ddfJson`, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities'];
  t.plan(routes.length);

  return async.forEach(routes, (route, fecb) => {
    return api.get(`/api/ddf/${route}?format=ddfJson`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      })
  }, (error) => {
    return t.end(error);
  });
});

test.skip.cb('check POST requests: concepts, entities, datapoints, schemas, when default dataset wasn\'t set', t => {
  const routes = ['concepts', 'datapoints', 'entities', 'concepts.schema', 'entities.schema', 'datapoints.schema'];
  t.plan(routes.length);

  return async.forEach(routes, (route, fecb) => {
    return api.post(`/api/ddf/ql`)
      .send({from: route})
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .end((error, res) => {
        t.deepEqual(res.body.error, 'Default dataset was not set');

        return fecb();
      });
  }, (error) => {
    return t.end(error);
  });
});

//test.skip.cb.after('clean test database', t => {
//  return cleanDatabase(t.end);
//});
