'use strict';

let mongoose = require('mongoose');

let OriginalEntities = mongoose.model('OriginalEntities');

let utils = require('../utils');

function OriginalEntitiesRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  OriginalEntitiesRepository.prototype[actionName] = utils.actionFactory(actionName)(OriginalEntities, this);
});

module.exports = OriginalEntitiesRepository;
