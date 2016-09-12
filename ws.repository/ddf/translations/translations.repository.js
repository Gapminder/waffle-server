'use strict';

const mongoose = require('mongoose');

const Translations = mongoose.model('Translations');

function TranslationsRepository() {
}

TranslationsRepository.prototype.findByLanguage = function (lang, onLoaded) {
  return onLoaded('TranslationsRepository.prototype.findByLanguage is not implemented');
};

module.exports = new TranslationsRepository();
