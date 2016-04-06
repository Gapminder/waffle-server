'use strict';

let mongoose = require('mongoose');
let async = require('async');

let EntityGroups = mongoose.model('EntityGroups');
let Entities = mongoose.model('Entities');

let utils = require('../utils');

function EntityGroupsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  EntityGroupsRepository.prototype[actionName] = utils.actionFactory(actionName)(EntityGroups, this);
});


module.exports = EntityGroupsRepository;
