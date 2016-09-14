'use strict';

const _ = require('lodash');
const translateByGoogleTranslate = require('./google-translate-provider');
const translateByYandexTranslate = require('./yandex-translate-provider');
const translationsRepository = require('../../ws.repository/ddf/translations/translations.repository');

const dictionary = {};

module.exports = {
  loadLanguage,
  translateUsingGoogle
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

function translateUsingGoogle(words, options, onTranslated) {
  const opts = _.defaults(options, {source: 'en', splitBy: '<>'});

  if (!opts.target) {
    return onTranslated('Target language was not provided for translation service');
  }

  return translateByYandexTranslate(_.extend({}, {text: _.join(words, opts.splitBy)}, opts), (error, translatedText) => {
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
