'use strict';

const _ = require('lodash');
const constants = require('../../ws.utils/constants');
const translateUsingBingScrapper = require('./bing-translate-scrapper');
const translationsRepository = require('../../ws.repository/ddf/translations/translations.repository');

const dictionary = {};

module.exports = {
  loadLanguage,
  translateUsingScrapper
};

function loadLanguage(lang, onTranslationForLangLoaded) {
  if (dictionary[lang]) {
    return onTranslationForLangLoaded(null, dictionary[lang], lang);
  }

  return translationsRepository.findByLanguage(lang, (error, translations) => {
    if (error) {
      return onTranslationForLangLoaded(error);
    }

    dictionary[lang] = _.map(translations, translation => [translation.source, translation.target]);
    return onTranslationForLangLoaded(null, dictionary[lang], lang);
  });
}

function translateUsingScrapper(words, options, onTranslated) {
  const opts = _.defaults(options, {source: 'en', splitBy: constants.TRANSLATION_SEPARATOR});

  if (!opts.target) {
    return onTranslated('Target language was not provided for translation service');
  }

  return translateUsingBingScrapper(_.extend({}, {text: _.join(words, opts.splitBy)}, opts), (error, translatedText) => {
    if (error) {
      return onTranslated(error);
    }

    const translationResult = opts.splitBy ? toWords(translatedText, opts.splitBy) : translatedText;
    return onTranslated(null, _.map(words, (word, index) => ({
      language: opts.target,
      source: word,
      target: translationResult[index]
    })));
  });
}

function toWords(text, separator) {
  return _.split(text, separator);
}
