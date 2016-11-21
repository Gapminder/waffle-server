'use strict';

const fs = require('fs');
const _ = require('lodash');
const hi = require('highland');
const logger = require('../../ws.config/log');
const translationsUtils = require('../utils/translations.utils');

module.exports = importTranslations_Hi;

function importTranslations_Hi(externalContext, done) {
  logger.info('start process creating translations');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'allChanges',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset',
  ]));
  const parsedLanguages = new Set();

  return hi(_.keys(externalContextFrozen.allChanges))
    .filter(filename => {
      return translationsUtils.translationsPattern.test(filename)
    })
    .map(filename => {
      return {filename, fileChanges: externalContextFrozen.allChanges[filename].body};
    })
    .flatMap(({filename, fileChanges}) => {
      const supplies = translationsUtils.parseFilename(filename, parsedLanguages, externalContextFrozen);
      return _.assign({}, supplies, {fileChanges});
    })
    .flatMap((context) => {
      return hi(context.fileChanges)
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
