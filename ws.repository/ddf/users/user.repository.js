'use strict';

let mongoose = require('mongoose');

let Users = mongoose.model('Users');

let utils = require('../../utils');

function UsersRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  UsersRepository.prototype[actionName] = utils.actionFactory(actionName)(Users, this);
});

module.exports = UsersRepository;
