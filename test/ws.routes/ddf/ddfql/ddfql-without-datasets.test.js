'use strict';

const express = require('express');
const api = require('supertest')('http://localhost:3000');
const async = require('async');

const expect = require('chai').expect;

const models = [
  'Concepts',
  'DataPoints',
  'Datasets',
  'DatasetTransactions',
  'Entities'
];

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test');
require('./../ws.repository/index.js')();

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

xit('check GET requests: concepts, entities, datapoints with parameter `format=json`, when default dataset wasn\'t set', done => {
  const routes = ['concepts', 'datapoints', 'entities'];


  return async.forEach(routes, (route, fecb) => {
    return api.get(`/api/ddf/${route}?format=json`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body.error).to.deep.equal(res.body.error);

        return fecb();
      });
  }, (error) => {
    return done(error);
  });
});

xit('check GET requests: concepts, entities, datapoints with parameter `format=wsJson`, when default dataset wasn\'t set', done => {
  const routes = ['concepts', 'datapoints', 'entities'];


  return async.forEach(routes, (route, fecb) => {
    return api.get(`/api/ddf/${route}?format=wsJson`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body.error).to.deep.equal(res.body.error);

        return fecb();
      });
  }, (error) => {
    return done(error);
  });
});

xit('check GET requests: concepts, entities, datapoints with parameter `format=ddfJson`, when default dataset wasn\'t set', done => {
  const routes = ['concepts', 'datapoints', 'entities'];


  return async.forEach(routes, (route, fecb) => {
    return api.get(`/api/ddf/${route}?format=ddfJson`)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body.error).to.deep.equal(res.body.error);

        return fecb();
      });
  }, (error) => {
    return done(error);
  });
});

xit('check POST requests: concepts, entities, datapoints, schemas, when default dataset wasn\'t set', done => {
  const routes = ['concepts', 'datapoints', 'entities', 'concepts.schema', 'entities.schema', 'datapoints.schema'];


  return async.forEach(routes, (route, fecb) => {
    return api.post(`/api/ddf/ql`)
      .send({from: route})
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .end((error, res) => {
        expect(res.body.error).to.deep.equal(res.body.error);

        return fecb();
      });
  }, (error) => {
    return done(error);
  });
});

//xit.after('clean test database', done => {
//  return cleanDatabase(done);
//});
