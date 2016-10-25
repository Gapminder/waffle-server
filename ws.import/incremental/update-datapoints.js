'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');

const mongoose = require('mongoose');

const common = require('./../common');
const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const ddfImportProcess = require('../../ws.utils/ddf-import-process');

const createDatasetIndex = require('./../import-dataset-index.service');
const translationsService = require('./../import-translations.service');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const processConceptChanges = require('./update-concepts')();

const LIMIT_NUMBER_PROCESS = 10;

module.exports = function processDataPointsChanges(externalContext, done) {
  logger.info('process data points changes');
  externalContext.datapointsFiles = _.omitBy(externalContext.allChanges, (ch, filename) => !filename.match(/ddf--datapoints--/g));

  return async.forEachOfSeries(
    externalContext.datapointsFiles,
    _processDataPointFile(externalContext),
    err => done(err, externalContext)
  );
};

function __getAllEntities(pipe, done) {
  logger.info('** get all entities');
  return entitiesRepositoryFactory.latestVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.entities = res;
      return done(err, pipe);
    });
}

function __getAllPreviousEntities(pipe, done) {
  return entitiesRepositoryFactory.previousVersion(pipe.dataset._id, pipe.transaction.createdAt)
    .findAllPopulated((err, res) => {
      pipe.previousEntities = res;
      return done(err, pipe);
    });
}
