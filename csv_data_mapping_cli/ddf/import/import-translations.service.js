'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');
const logger = require('../../../ws.config/log');

const constants = require('../../../ws.utils/constants');
const translateService = require('../../../ws.services/translations/translations.service.js');

module.exports = {
  processTranslations,
  divideWordsIntoChunks: _divideWordsIntoChunks
};

function processTranslations(pipe, done) {
  logger.info('start process creating translations');
  const conceptsByType = _.groupBy(pipe.concepts, 'type');
  const stringConcepts = conceptsByType['string'];
  const stringConceptsGids = _.map(stringConcepts, constants.GID);

  const concepts = _.values(pipe.concepts);

  const rawTranslations = _.chain(pipe.entities)
    .concat(concepts)
    .flatMap((entry) => _.chain(entry)
      .get('properties', {})
      .pick(stringConceptsGids)
      .values()
      .value()
    )
    .uniq()
    .compact()
    .value();

  const options = {
    transaction: pipe.transaction,
    languages: constants.TRANSLATION_LANGUAGES,
    rawTranslations
  };
  return async.waterfall([
    async.constant(options),
    findAllTranslations,
    filterExistedTranslations,
    translateToAnotherLanguage,
    createTranslations
  ], error => {
    return done(error, pipe);
  });
}

function findAllTranslations(pipe, done) {
  logger.info('** find all translations');

  const query = {
    language: {$in: pipe.languages}
  };

  return mongoose.model('Translations').find(query)
    .lean()
    .exec((error, translations) => {
    if (error) {
      return done(error);
    }

    pipe.translations = translations;

    return done(null, pipe);
  });
}

function filterExistedTranslations(pipe, done) {
  logger.info('** filter existed translations');

  const translationsByLanguages = _.groupBy(pipe.translations, 'language');

  return async.setImmediate(() => {
    const wordsToTranslateByLanguage = _.reduce(pipe.languages, (result, language) => {
      const translationsByLanguage = _.map(translationsByLanguages[language], 'source');

      result[language] = _.chain(pipe.rawTranslations)
        .filter((rawTranslation) => _.size(rawTranslation) < constants.TRANSLATION_CHUNK_LIMIT && !_.isObject(rawTranslation) && !_.isNil(rawTranslation))
        .uniq()
        .difference(translationsByLanguage)
        .value();

      return result;
    }, {});

    pipe.wordsToTranslateByLanguage = wordsToTranslateByLanguage;

    return done(null, pipe);
  });
}

function translateToAnotherLanguage(pipe, done) {
  logger.info(`** translate all founded words to '${_.join(pipe.languages, ', ')}' languages`);

  return async.reduce(pipe.languages, [], (result, language, mscb) => {
    const words = pipe.wordsToTranslateByLanguage[language];
    const wordChunks = _divideWordsIntoChunks(words);

    logger.info(`**** translate ${_.sumBy(wordChunks, 'length')} words to '${language}' language`);

    return _translateWordsByChunks(wordChunks, language, (error, translatedChunks) => {
      if (error) {
        return mscb(error);
      }
      result = result.concat(translatedChunks);
      return mscb(null, result);
    });
  }, (error, translatedWords) => {

    pipe.translatedWords = _.map(translatedWords, (word) => _.extend(word, {transaction: pipe.transaction._id}));

    return done(error, pipe);
  });
}

function _divideWordsIntoChunks(words) {
  logger.info('**** divide words into chunks');

  let chunkIndex = 0;
  let lastChunkLength = 0;

  const wordChunks = _.reduce(words, (chunks, word) => {
    const wordSize = _.size(word);
    const translationSeparatorLength = constants.TRANSLATION_SEPARATOR.length;
    const currentChunkLength = lastChunkLength + translationSeparatorLength + wordSize;

      if (currentChunkLength >= constants.TRANSLATION_CHUNK_LIMIT) {
        chunkIndex++;
      }

      if (_.isEmpty(chunks[chunkIndex])) {
        lastChunkLength = wordSize;
        chunks[chunkIndex] = [word];
        return chunks;
      }

      lastChunkLength += translationSeparatorLength + wordSize;
      chunks[chunkIndex].push(word);

      return chunks;
    }, []);

  return wordChunks;
}

function _translateWordsByChunks(wordChunks, language, done) {
  let index = 0;
  return async.concatSeries(wordChunks, (wordChunk, cscb) => {
    logger.info(`**** translate words from ${++index} chunk`);
    const options = {splitBy: constants.TRANSLATION_SEPARATOR, target: language};

    return translateService.translateUsingScrapper(wordChunk, options, cscb);
  }, done);
}

function createTranslations(pipe, done) {
  logger.info('** create translations documents');

  return async.eachLimit(
    _.chunk(pipe.translatedWords, 100),
    constants.LIMIT_NUMBER_PROCESS,
    __createTranslationsDocuments,
    (err) => {
      return done(err, pipe);
    }
  );
}

function __createTranslationsDocuments(chunk, done) {
  return mongoose.model('Translations').create(chunk, done);
}
