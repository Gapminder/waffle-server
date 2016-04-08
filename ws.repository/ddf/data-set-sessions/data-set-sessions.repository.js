'use strict';

const mongoose = require('mongoose');
const DataSetSessions = mongoose.model('DataSetSessions');
const utils = require('../../utils');

function DataSetSessionsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DataSetSessionsRepository.prototype[actionName] = utils.actionFactory(actionName)(DataSetSessions, this);
});

module.exports = DataSetSessionsRepository;
