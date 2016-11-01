'use strict';

const fs = require('fs');
const _ = require('lodash');
const hi = require('highland');

const logger = require('../ws.config/log');
const ddfUtils = require('./import-ddf.utils');
const translationsUtils = require('./translations.utils');

module.exports = importTranslations;

function importTranslations(externalContext, done) {
  logger.info('start process creating translations');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'concepts',
    'entities',
    'transaction',
    'dataset',
    'resolvePath'
  ]));
  const parsedLanguages = new Set();

  const readdir = hi.wrapCallback(fs.readdir);

  return readdir(externalContextFrozen.pathToDdfFolder)
    .flatMap(filenames => {
      return hi(filenames);
    })
    .filter(filename => {
      return translationsUtils.translationsPattern.test(filename)
    })
    .map(filename => {
      return translationsUtils.parseFilename(filename, parsedLanguages, externalContextFrozen);
    })
    .flatMap((context) => {
      return ddfUtils.readCsvFile(externalContextFrozen.resolvePath(context.filename), {})
        .map(row => ({row, context}));
    })
    .map(({row, context}) => {
      return hi(translationsUtils.createFoundTranslation(row, context, externalContextFrozen));
    })
    .errors(error => {
      logger.error(error);
      return done(error);
    })
    .done(() => {
      return translationsUtils.updateTransactionLanguages(parsedLanguages, externalContextFrozen, (error) => {
        if (error) {
          return done(error);
        }

        logger.info('finished process creating translations');

        return done(null, externalContext);
      });
    });
}
