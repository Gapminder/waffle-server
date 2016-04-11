'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

_.forEach([
  'concepts',
  'data-points',
  'data-set-versions',
  'data-set-sessions',
  'data-sets',
  'entities',
  'entity-groups',
  'measures',
  'translations',
  'users',
  'changelogs'
], model => require(`./${model}/${model}.model`));

mongoose.connect('mongodb://localhost:27017/ws_ddf', (err) => {
  if (err) {
    throw err;
  }

  async.waterfall([
    async.constant({}),
    (pipe, done) => getUser(pipe, done),
    (pipe, done) => getDataSet(pipe, done),
    (pipe, done) => getOldVersion(pipe, done),
    (pipe, done) => createVersion(pipe, done),
    (pipe, done) => createSession(pipe, done),
    (pipe, done) => getEntityGroups(pipe, done),
    (pipe, done) => getEntities(pipe, done),
    (pipe, done) => getMeasures(pipe, done),
    (pipe, done) => getDataPoints(pipe, done),
    (pipe, done) => getConcepts(pipe, done),
    (pipe, done) => createChangelog(pipe, done)
  ], (err) => {
    if (err) {
      throw err;
    }

    console.log('done!');

    process.exit(0);
  });

  function getUser(pipe, done) {
    mongoose.model('Users').findOne({}, (err, res) => {
      pipe.user = res;
      return done(err, pipe);
    });
  }

  function getDataSet(pipe, done) {
    mongoose.model('DataSets').findOne({}, (err, res) => {
      pipe.dataSet = res;
      return done(err, pipe);
    });
  }

  function getOldVersion(pipe, done) {
    mongoose.model('DataSetVersions').findOne({}, (err, res) => {
      pipe.oldVersion = res;
      return done(err, pipe);
    });
  }

  function createVersion(pipe, done) {
    mongoose.model('DataSetVersions').create({
      value: Math.random().toString(),
      createdBy: pipe.user._id,
      dataSet: pipe.dataSet._id,
      basedOn: pipe.oldVersion._id
    }, (err, res) => {
      pipe.version = res;
      return done(err, pipe);
    });
  }

  function createSession(pipe, done) {
    mongoose.model('DataSetSessions').create({
      version: pipe.version._id,
      createdBy: pipe.user._id
    }, (err, res) => {
      pipe.session = res;
      return done(err, pipe);
    });
  }

  function getEntityGroups(pipe, done) {
    mongoose.model('EntityGroups').findOne({}, (err, res) => {
      pipe.entityGroup = res;
      return done(err, pipe);
    });
  }

  function getEntities(pipe, done) {
    mongoose.model('Entities').findOne({}, (err, res) => {
      pipe.entity = res;
      return done(err, pipe);
    });
  }

  function getMeasures(pipe, done) {
    mongoose.model('Measures').findOne({}, (err, res) => {
      pipe.measure = res;
      return done(err, pipe);
    });
  }

  function getDataPoints(pipe, done) {
    mongoose.model('DataPoints').findOne({}, (err, res) => {
      pipe.dataPoint = res;
      return done(err, pipe);
    });
  }

  function getConcepts(pipe, done) {
    mongoose.model('Concepts').findOne({}, (err, res) => {
      pipe.concept = res;
      return done(err, pipe);
    });
  }

  function createChangelog(pipe, done) {
    let changelogs = [
      {collectionName: 'EntityGroups', document: pipe.entityGroup, createdAt: new Date(), action: 'INSERT', session: pipe.session._id},
      {collectionName: 'Entities', document: pipe.entity, createdAt: new Date(), action: 'UPDATE', session: pipe.session._id},
      {collectionName: 'Measures', document: pipe.measure, createdAt: new Date(), action: 'REMOVE', session: pipe.session._id},
      {collectionName: 'DataPoints', document: pipe.dataPoint, createdAt: new Date(), action: 'INSERT', session: pipe.session._id},
      {collectionName: 'Concepts', document: pipe.concept, createdAt: new Date(), action: 'REMOVE', session: pipe.session._id},
    ];

    mongoose.model('Changelogs').create(changelogs, (err, res) => {
      pipe.concepts = res;
      done(err, pipe);
    });
  }
});
