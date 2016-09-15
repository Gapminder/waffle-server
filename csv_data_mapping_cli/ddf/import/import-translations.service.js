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
    createTranslations
  ], error => {
    if (error) {
      logger.warn(error);
    }
    // intentionally skipping error, because we don't want to
    // break importing or incremental updating process
    // in case of errors during translation creation
    return done(null, pipe);
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

      result = _.chain(pipe.rawTranslations)
        .filter((rawTranslation) => _.size(rawTranslation) < constants.TRANSLATION_CHUNK_LIMIT && !_.isObject(rawTranslation) && !_.isNil(rawTranslation))
        .difference(translationsByLanguage)
        .concat(result)
        .value();

      return result;
    }, []);

    pipe.wordsToTranslateByLanguage = _.uniq(wordsToTranslateByLanguage);

    return done(null, pipe);
  });
}

function createTranslations(pipe, done) {
  logger.info(`** translate all founded words to '${_.join(pipe.languages, ', ')}' languages`);

  const createTranslationsByChunks = async.seq(_translateToAnotherLanguage, _createTranslationsFromChunk);
  const words = pipe.wordsToTranslateByLanguage;
  const wordChunks = _divideWordsIntoChunks(words);
  const wordChunksByLanguage = _.flatMap(wordChunks, (wordChunk) => {
    return _.map(pipe.languages, (language) => ({words: wordChunk, language, transaction: pipe.transaction}));
  });

  let index = 0;
  return async.eachSeries(wordChunksByLanguage, (chunk, escb) => {
    logger.info(`**** translate ${chunk.words.length} words from ${++index} chunk into '${chunk.language}' language`);
    return createTranslationsByChunks(chunk, escb);
  }, (err) => {
    return done(err, pipe);
  });
}

function _divideWordsIntoChunks(words) {
  logger.info('**** divide words into chunks');

  let chunkIndex = 0;
  let lastChunkLength = 0;

  const wordChunks = _.reduce(words, (chunks, word) => {
    const encodedWord = encodeURI(word);
    const wordLength = encodedWord.length;
    const translationSeparatorLength = encodeURI(constants.TRANSLATION_SEPARATOR).length;
    const currentChunkLength = lastChunkLength + translationSeparatorLength + wordLength;

    if (currentChunkLength >= constants.TRANSLATION_CHUNK_LIMIT) {
      chunkIndex++;
    }

    if (_.isEmpty(chunks[chunkIndex])) {
      lastChunkLength = wordLength;
      chunks[chunkIndex] = [word];
      return chunks;
    }

    lastChunkLength += translationSeparatorLength + wordLength;
    chunks[chunkIndex].push(word);

    return chunks;
  }, []);

  return wordChunks;
}

function _translateToAnotherLanguage(pipe, done) {
  const options = {splitBy: constants.TRANSLATION_SEPARATOR, target: pipe.language};

  return translateService.translateUsingScrapper(pipe.words, options, (error, translatedWords) => {
    if (error) {
      return done(error);
    }

    pipe.translatedWords = _.map(translatedWords, (word) => {
      return _.extend(word, {transaction: pipe.transaction._id})
    });

    return done(null, pipe);
  });
}

function _createTranslationsFromChunk(pipe, done) {
  logger.info('** create translations documents from chunk');

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
