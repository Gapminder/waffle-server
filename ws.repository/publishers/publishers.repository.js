'use strict';

var mongoose = require('mongoose');
var Publishers = mongoose.model('Publishers');

var utils = require('../utils');

function PublishersRepository() {
}

['update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  PublishersRepository.prototype[actionName] = utils.actionFactory(actionName)(Publishers, this);
});

module.exports = PublishersRepository;
