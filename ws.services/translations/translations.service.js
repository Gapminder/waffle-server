'use strict';

const _ = require('lodash');
const constants = require('../../ws.utils/constants');
const translateUsingBingScrapper = require('./bing-translate-scrapper');
const translationsRepository = require('../../ws.repository/ddf/translations/translations.repository');

module.exports = {
  loadLanguage,
  translateUsingScrapper
};

function loadLanguage(lang, onTranslationForLangLoaded) {
    return translationsRepository.findByLanguage(lang, (error, translations) => {
    if (error) {
      return onTranslationForLangLoaded(error);
    }

    const dictionary = _.reduce(translations, (result, translation) => {
      result[_.toLower(translation.source)] = translation.target;
      return result;
    }, {});
    return onTranslationForLangLoaded(null, dictionary, lang);
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
