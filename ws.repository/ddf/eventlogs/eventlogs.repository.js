'use strict';

const mongoose = require('mongoose');
const Eventlogs = mongoose.model('Eventlogs');
const utils = require('../../utils');

function EventlogsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  EventlogsRepository.prototype[actionName] = utils.actionFactory(actionName)(Eventlogs, this);
});

module.exports = EventlogsRepository;
