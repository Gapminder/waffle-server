'use strict';

const mongoose = require('mongoose');
const DatasetTransactions = mongoose.model('DatasetTransactions');
const utils = require('../../utils');

function DatasetTransactionsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DatasetTransactionsRepository.prototype[actionName] = utils.actionFactory(actionName)(DatasetTransactions, this);
});

module.exports = DatasetTransactionsRepository;
