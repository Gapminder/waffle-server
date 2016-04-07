'use strict';

const _ = require('lodash');
const async = require('async');

_.forEach([
  'concepts',
  'data-points',
  'data-set-versions',
  'data-sets',
  'entities',
  'entity-groups',
  'measures',
  'translations',
  'users',
  'changelogs',
  'sessions'
], model => require(`./${model}/${model}.model`));

require('mongoose').connect('mongodb://localhost:27017/ws_ddf', (err) => {
  if (err) {
    throw err;
  }

  async.waterfall([
    (done) => done(null, {}),
    (pipe, done) => createUser(pipe, done),
    (pipe, done) => createDataSet(pipe, done),
    (pipe, done) => createVersion(pipe, done),
    (pipe, done) => createSession(pipe, done),
    (pipe, done) => createEntityGroup(pipe, done),
    (pipe, done) => createEntity(pipe, done),
    (pipe, done) => createMeasure(pipe, done),
    (pipe, done) => createDataPoint(pipe, done),
    (pipe, done) => createConcept(pipe, done),
    (pipe, done) => createTranslation(pipe, done),
    (pipe, done) => createChangelog(pipe, done)
  ], (err, result) => {
    if (err) {
      throw err;
    }

    console.log(result, 'done!');
  });

  function createUser(pipe, done) {
    mongoose.model('Users').insert({
      name: 'Vasya Pupkin',
      email: 'email@email.com',
      username: 'VPup',
      password: 'VPup'
    }, (err, res) => {
      pipe.user = res;
      return done(null, pipe);
    });
  }

  function createDataSet(pipe, done) {
    mongoose.model('DataSets').insert({
      dsId: Math.random().toString(),
      type: 'local',
      uri: '/c/users',
      dataProvider: 'hands',
      createdBy: pipe.user._id
    }, (err, res) => {
      pipe.dataSet = res;
      return done(null, pipe);
    });
  }

  function createVersion(pipe, done) {
    mongoose.model('DataSetVersions').insert({
      value: Math.random().toString(),
      createdBy: pipe.user._id,
      dataSet: pipe.dataSet._id
    }, (err, res) => {
      pipe.version = res;
      return done(null, pipe);
    });
  }

  function createSession(pipe, done) {
    mongoose.model('Sessions').insert({
      version: pipe.version._id,
      createdBy: pipe.user._id
    }, (err, res) => {
      pipe.session = res;
      return done(null, pipe);
    });
  }

  function createEntityGroup(pipe, done) {
    function createGeo(pipe, done) {
      mongoose.model('EntityGroups').insert({
        gid: 'geo',
        name: 'Geo',
        type: 'entity_domain',
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.geo = res;
        return done(null, pipe);
      });
    }

    function createCountry(pipe, done) {
      mongoose.model('EntityGroups').insert({
        gid: 'country',
        name: 'Country',
        type: 'entity_set',
        parent: pipe.geo._id,
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.country = res;
        return done(null, pipe);
      });
    }

    function createTime(pipe, done) {
      mongoose.model('EntityGroups').insert({
        gid: 'time',
        name: 'Time',
        type: 'entity_domain',
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.time = res;
        return done(null, pipe);
      });
    }

    async.waterfall([
      (done) => done(null, {}),
      (pipe, done) => createGeo(pipe, done),
      (pipe, done) => createCountry(pipe, done),
      (pipe, done) => createTime(pipe, done)
    ], (err, res) => {
      pipe.entityGroups = res;
      return done(null, pipe);
    });
  }

  function createEntity(pipe, done) {
    function createCountry() {

    }

    async.parallel(

    );
  }
});



