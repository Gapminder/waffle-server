'use strict';

let mongoose = require('mongoose');

let Entities = mongoose.model('Entities');

let utils = require('../utils');

function EntitiesRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  EntitiesRepository.prototype[actionName] = utils.actionFactory(actionName)(Entities, this);
});

module.exports = EntitiesRepository;
