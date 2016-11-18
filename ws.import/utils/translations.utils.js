'use strict';

const fs = require('fs');
const _ = require('lodash');

const logger = require('../../ws.config/log');
const constants = require('../../ws.utils/constants');
const entitiesUtils = require('./entities.utils');
const datapointsUtils = require('./datapoints.utils');
const datapointsRepository = require('../../ws.repository/ddf/data-points/data-points.repository');
const entitiesRepository = require('../../ws.repository/ddf/entities/entities.repository');
const conceptsRepository = require('../../ws.repository/ddf/concepts/concepts.repository');
const transactionsRepository = require('../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');

const translationsPattern = /^ddf--translation--(([a-z]{2}-[a-z]{2,})|([a-z]{2,}))--/;
const repositories = {
  [constants.DATAPOINTS]: datapointsRepository,
  [constants.ENTITIES]: entitiesRepository,
  [constants.CONCEPTS]: conceptsRepository
};

module.exports = {
  parseFilename,
  createFoundTranslation,
  updateTransactionLanguages,

  translationsPattern
};

function parseFilename(filename, languages, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const language = _.get(filename.match(translationsPattern), '1', null);
  const dataFilename = _.replace(filename, translationsPattern, 'ddf--');
  const translatedModel = _.get(dataFilename.match(/^ddf--(\w{1,})--/), '1', null);

  if (_.isEmpty(language)) {
    throw Error(`file '${filename}' doesn't have any language.`);
  }

  languages.add(language);
  logger.info(`** parsed language: ${language}`, `** parsed data filename: ${dataFilename}`, `** parsed translated model: ${translatedModel}`);

  let parsedConcepts;

  if (translatedModel === constants.DATAPOINTS) {
    parsedConcepts = datapointsUtils.getDimensionsAndMeasures(dataFilename, externalContext);
  }

  if (translatedModel === constants.ENTITIES) {
    parsedConcepts = entitiesUtils.parseFilename(dataFilename, externalContext);
  }

  return _.assign({}, {filename, translatedModel, language}, parsedConcepts);
}

function createFoundTranslation(properties, context, externalContext) {
  const repository = repositories[context.translatedModel];
  if (!repository) return;

  return createFoundTranslationFor(repository, {properties, context, externalContext});
}

function createFoundTranslationFor(repository, {properties, context, externalContext}) {
  return repository
    .currentVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .addTranslationsForGivenProperties(properties, context);
}

function updateTransactionLanguages(parsedLanguagesSet, externalContext, done) {
  const options = {
    transactionId: externalContext.transaction._id,
    languages: Array.from(parsedLanguagesSet.values())
  };

  return transactionsRepository.setLanguages(options, done);
}
