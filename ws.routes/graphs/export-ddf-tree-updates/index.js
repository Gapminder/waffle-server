'use strict';

const _ = require('lodash');
const async = require('async');
const express = require('express');
const mongoose = require('mongoose');

module.exports = (app, done, options = {}) => {
  const config = app.get('config');

  const datasetName = options.datasetName || config.DATASET_NAME;
  const version = options.version || config.INCREMENTAL_EXPORT_TO_VERSION;

  if (!datasetName) {
    throw new Error('Dataset name was not given - cannot invoke incremental export without it');
  }

  if (!version) {
    throw new Error('Version to which dataset should be updated was not given - cannot invoke incremental export without it');
  }

  const neo4jdb = app.get('neo4jDb');
  const logger = app.get('log');

  const updateEntityDomains = require('./updateEntityDomains')(neo4jdb);
  const updateEntitySets = require('./updateEntitySets')(neo4jdb);
  const updateEntities = require('./updateEntities')(neo4jdb);
  const updateMeasures = require('./updateMeasures')(neo4jdb);
  const updateDatapoints = require('./updateDatapoints')(neo4jdb);

  logger.info('Incremental export started');
  console.time('Incremental export completed');
  async.waterfall([
    async.constant({datasetName, version: Number(version)}),
    findDataset,
    updateMeasures,
    updateEntityDomains,
    updateEntitySets,
    updateEntities,
    updateDatapoints,
    updateDatasetVersion
  ], error => {
    console.timeEnd('Incremental export completed');
    done(error);
  });

  function findDataset(pipe, onDatasetFound) {
    const Datasets = mongoose.model('Datasets');

    async.waterfall([
        done => Datasets.findOne({name: pipe.datasetName, versions: pipe.version}).lean().exec(done),
        (dataset, done) => {
          if (!dataset) {
            return done('Dataset with a given version was not found');
          }

          pipe.dataset = dataset;

          neo4jdb.cypherQuery(`
            MATCH (n:Dataset {name: '${dataset.name}'})-[:WITH_ENTITY_DOMAIN]->() 
            RETURN id(n), n.versions LIMIT 1`, (error, response) => {

            if (error) {
              return done(error);
            }

            const neoIdAndVersions = _.flatten(response.data);
            const neoId = _.first(neoIdAndVersions);
            const versions = _.last(neoIdAndVersions);

            if (_.includes(versions, pipe.version)) {
              return done('Dataset is already up to date - cannot perform update having no changes');
            }

            pipe.dataset.neoId = neoId;
            return done();
          });
        }
      ],
      error => onDatasetFound(error, pipe));
  }

  function updateDatasetVersion(pipe, onDatasetVersionUpdated) {
    return neo4jdb.cypherQuery(`
      MATCH (n:Dataset {name: '${datasetName}'})-[:WITH_ENTITY_DOMAIN]->()
      WHERE id(n) = ${pipe.dataset.neoId} 
      SET n.versions = n.versions + ${pipe.version}`, onDatasetVersionUpdated);
  }
};
