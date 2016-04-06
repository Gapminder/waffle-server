'use strict';

let mongoose = require('mongoose');

let DataSets = mongoose.model('DataSets');

let utils = require('../utils');

function DataSetsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DataSetsRepository.prototype[actionName] = utils.actionFactory(actionName)(DataSets, this);
});

module.exports = DataSetsRepository;
