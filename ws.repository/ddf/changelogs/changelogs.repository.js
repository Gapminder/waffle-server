'use strict';

const mongoose = require('mongoose');
const Changelogs = mongoose.model('Changelogs');
const utils = require('../../utils');

function ChangelogsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  ChangelogsRepository.prototype[actionName] = utils.actionFactory(actionName)(Changelogs, this);
});

module.exports = ChangelogsRepository;
