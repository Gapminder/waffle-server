'use strict';

const mongoose = require('mongoose');
const Concepts = mongoose.model('Concepts');
const utils = require('../../utils');

function ConceptsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  ConceptsRepository.prototype[actionName] = utils.actionFactory(actionName)(Concepts, this);
});

module.exports = ConceptsRepository;
