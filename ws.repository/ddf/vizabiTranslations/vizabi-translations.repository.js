'use strict';

const mongoose = require('mongoose');
const VizabiTranslations = mongoose.model('VizabiTranslations');
const utils = require('../../utils');

function VizabiTranslationsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  VizabiTranslationsRepository.prototype[actionName] = utils.actionFactory(actionName)(VizabiTranslationsRepository, this);
});

module.exports = VizabiTranslationsRepository;
