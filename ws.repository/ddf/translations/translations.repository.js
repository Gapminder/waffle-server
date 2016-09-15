'use strict';

const mongoose = require('mongoose');

const Translations = mongoose.model('Translations');

function TranslationsRepository() {
}

TranslationsRepository.prototype.findByLanguage = function (lang, onLoaded) {
  return Translations.find({language: lang}).lean().exec(onLoaded);
};

module.exports = new TranslationsRepository();
