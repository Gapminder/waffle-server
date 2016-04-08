'use strict';

const mongoose = require('mongoose');
const Translations = mongoose.model('Translations');
const utils = require('../../utils');

function TranslationsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  TranslationsRepository.prototype[actionName] = utils.actionFactory(actionName)(Translations, this);
});

module.exports = TranslationsRepository;
