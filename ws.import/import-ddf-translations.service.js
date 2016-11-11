'use strict';

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const hi = require('highland');

const logger = require('../ws.config/log');
const ddfUtils = require('./import-ddf.utils');
const constants = require('../ws.utils/constants');
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
    'datapackage',
    'files'
  ]));
  const parsedLanguages = new Set();

  const readdir = hi.wrapCallback(fs.readdir);

  return hi(externalContextFrozen.datapackage.translations)
    .flatMap(languageMeta => {
      const resolvedPath = path.resolve(externalContextFrozen.pathToDdfFolder, constants.TRANSLATIONS_DIR_NAME, languageMeta.id);
      return readdir(resolvedPath).map(filepaths => {
        return _.map(filepaths, filepath => ({translationsFile: externalContextFrozen.files.byPaths[filepath], languageMeta: languageMeta}));
      });
    })
    .flatMap((test)=> {
      return translationsUtils.parseFilename(translationsFile, languageMeta, externalContextFrozen);
    })
    .flatMap((context) => {
      return ddfUtils.readCsvFile(context.translationsFile.absolutePath, {})
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
