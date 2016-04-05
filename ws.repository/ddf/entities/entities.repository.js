'use strict';

var mongoose = require('mongoose');
var Entities = mongoose.model('Entities');

var utils = require('../utils');

function EntitiesRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  EntitiesRepository.prototype[actionName] = utils.actionFactory(actionName)(Entities, this);
});

module.exports = EntitiesRepository;
