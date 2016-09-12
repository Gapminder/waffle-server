'use strict';

const _ = require('lodash');
const translateByGoogleTranslate = require('./google-translate-provider');
const translationsRepository = require('../../ws.repository/ddf/translations/translations.repository');

const langToWords = new Map();

module.exports = {
  loadLanguage,
  translateUsingGoogle
};

function loadLanguage(lang, onTranslationForLangLoaded) {
  if (langToWords.has(lang)) {
    return onTranslationForLangLoaded(null, langToWords.get(lang));
  }

  return translationsRepository.findByLanguage(lang, (error, translations) => {
    if (error) {
      return onTranslationForLangLoaded(error);
    }

    langToWords.set(lang, new Map(_.map(translations, translation => [translation.source, translation.target])));
    return onTranslationForLangLoaded(null, translations);
  });
}

function translateUsingGoogle(words, options, onTranslated) {
  const opts = _.defaults(options, {source: 'en', splitBy: '<>'});

  if (!opts.target) {
    return onTranslated('Target language was not provided for translation service');
  }

  return translateByGoogleTranslate(_.extend({}, {text: _.join(words, opts.splitBy)}, opts), (error, translatedText) => {
    if (error) {
      return onTranslated(error);
    }

    const translationResult = opts.splitBy ? toWords(translatedText, opts.splitBy) : translatedText;
    return onTranslated(null, _.zipObject(words, translationResult));
  });
}

function toWords(text, separator) {
  return _.split(_.replace(text, /\s/g, ''), separator);
}
