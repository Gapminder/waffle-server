'use strict';

var mongoose = require('mongoose');
var async = require('async');

var EntityGroups = mongoose.model('EntityGroups');
var Entities = mongoose.model('Entities');

var utils = require('../utils');

function EntityGroupsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  EntityGroupsRepository.prototype[actionName] = utils.actionFactory(actionName)(EntityGroups, this);
});


module.exports = EntityGroupsRepository;
