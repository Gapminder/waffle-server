'use strict';

const fs = require('fs');
const _ = require('lodash');
const hi = require('highland');
const mongoose = require('mongoose');
const Converter = require('csvtojson').Converter;

const common = require('./common');
const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');
const entitiesUtils = require('./entities.utils');
const datapointsUtils = require('./datapoints.utils');
const datapointsRepository = require('../ws.repository/ddf/data-points/data-points.repository');
const entitiesRepository = require('../ws.repository/ddf/entities/entities.repository');
const conceptsRepository = require('../ws.repository/ddf/concepts/concepts.repository');

const translationsPattern = /^ddf--translation--(([a-z]{2}-[a-z]{2,})|([a-z]{2,}))--/;

module.exports = {
  parseFilename,
  readCsvFile_Hi,
  createFoundTranslation,
  updateTransactionLanguages,

  translationsPattern
};

function parseFilename(filename, languages, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const language = filename.match(translationsPattern)[1];
  const dataFilename = filename.replace(translationsPattern, 'ddf--');
  const translatedModel = dataFilename.match(/^ddf--(\w{1,})--/)[1];

  if (_.isEmpty(language)) {
    throw Error(`file '${filename}' doesn't have any language.`);
  }

  languages.add(language);
  logger.info(`** parsed language: ${language}`);
  logger.info(`** parsed data filename: ${dataFilename}`);
  logger.info(`** parsed translated model: ${translatedModel}`);

  let parsedConcepts;

  if (translatedModel === constants.DATAPOINTS) {
    parsedConcepts = datapointsUtils.parseFilename(dataFilename, externalContext);
  }

  if (translatedModel === constants.ENTITIES) {
    parsedConcepts = entitiesUtils.parseFilename(dataFilename, externalContext);
  }

  return _.assign({}, {filename, translatedModel, language}, parsedConcepts);
}

function readCsvFile_Hi(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8').pipe(new Converter({constructResult: false}, {objectMode: true})));
}

function createFoundTranslation(properties, context, externalContext) {
  if (context.translatedModel === constants.DATAPOINTS) {
    return datapointsRepository
      .currentVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
      .addTranslationsForGivenProperties(properties, context);
  }

  if (context.translatedModel === constants.ENTITIES) {
    return entitiesRepository
      .currentVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
      .addTranslationsForGivenProperties(properties, context);
  }

  if (context.translatedModel === constants.CONCEPTS) {
    return conceptsRepository
      .currentVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
      .addTranslationsForGivenProperties(properties, context);
  }

  return;
}

function updateTransactionLanguages(parsedLanguages, externalContext, done) {
  let languages = [];

  parsedLanguages.forEach(lang =>{
    languages.push(lang);
  });

  return mongoose.model('DatasetTransactions').update({_id: externalContext.transaction._id}, {
    $set: {
      languages
    }
  }).exec(done);
}
