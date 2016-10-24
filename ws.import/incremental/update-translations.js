'use strict';

const fs = require('fs');
const _ = require('lodash');
const hi = require('highland');
const logger = require('../../ws.config/log');

const common = require('../common');
const constants = require('../../ws.utils/constants');

const translationsPattern = /^ddf--translation--(([a-z]{2}-[a-z]{2,})|([a-z]{2,}))--/;

module.exports = importTranslations_Hi;

function importTranslations_Hi(externalContext, done) {
  logger.info('start process creating translations');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'concepts',
    'entities',
    'transaction',
    'dataset',
    'resolvePath'
  ]));

  const readdir = hi.wrapCallback(fs.readdir);

  return readdir(externalContextFrozen.pathToDdfFolder)
    .flatMap(filenames => {
      return hi(filenames);
    })
    .filter(filename => {
      return translationsPattern.test(filename)
    })
    .map(filename => {
      const {translatedModel, measures, dimensions, language} = _parseFilename_Hi(filename, externalContext);
      return {filename, translatedModel, language, measures, dimensions};
    })
    .flatMap((context) => {
      return readCsvFile_Hi(externalContextFrozen.resolvePath(context.filename), {})
        .map(row => ({row, context}));
    })
    .map(({row, context}) => {
      return hi(createFoundTranslation(row, context));
    })
    .errors(error => {
      logger.error(error);
      return done(error);
    })
    .done(() => {
      logger.info('finished process creating translations');
      return done(null, externalContext);
    });
}

function _parseFilename_Hi(filename, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const language = filename.match(translationsPattern)[1];
  const dataFilename = filename.replace(translationsPattern, 'ddf--');
  const parsedFilename = common.getMeasureDimensionFromFilename(dataFilename);
  const translatedModel = dataFilename.match(/^ddf--(\w{1,})--/)[1];
  const measureGids = parsedFilename.measures;
  const dimensionGids = parsedFilename.dimensions;

  const measures = _.pick(externalContext.concepts, measureGids);
  const dimensions = _.pick(externalContext.concepts, dimensionGids);

  if (_.isEmpty(measures)) {
    throw Error(`file '${filename}' doesn't have any measure.`);
  }

  if (_.isEmpty(dimensions)) {
    throw Error(`file '${filename}' doesn't have any dimensions.`);
  }

  if (_.isEmpty(language)) {
    throw Error(`file '${filename}' doesn't have any language.`);
  }

  logger.info(`** parsed language: ${language}`);
  logger.info(`** parsed translated model: ${translatedModel}`);
  logger.info(`** parsed data filename: ${dataFilename}`);
  logger.info(`** parsed measures: ${_.keys(measures)}`);
  logger.info(`** parsed dimensions: ${_.keys(dimensions)}`);

  return {translatedModel, measures, dimensions, language};
}

function readCsvFile_Hi(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8').pipe(new Converter({constructResult: false}, {objectMode: true})));
}

function createFoundTranslation(row, context) {
  return;
}
