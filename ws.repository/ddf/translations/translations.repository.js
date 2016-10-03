'use strict';

const mongoose = require('mongoose');

const Translations = mongoose.model('Translations');

function TranslationsRepository() {
}

TranslationsRepository.prototype.create = function (translations, onCreated) {
  return Translations.create(translations, onCreated);
};

TranslationsRepository.prototype.findByLanguage = function (lang, onLoaded) {
  return Translations.find({language: lang}).lean().exec(onLoaded);
};

TranslationsRepository.prototype.findByLanguages = function (langs, onLoaded) {
  return Translations.find({language: {$in: langs}}).lean().exec(onLoaded);
};

module.exports = new TranslationsRepository();
