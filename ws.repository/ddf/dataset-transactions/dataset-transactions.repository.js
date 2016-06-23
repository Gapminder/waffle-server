'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const DatasetTransactions = mongoose.model('DatasetTransactions');
const utils = require('../../utils');

function DatasetTransactionsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DatasetTransactionsRepository.prototype[actionName] = utils.actionFactory(actionName)(DatasetTransactions, this);
});

DatasetTransactionsRepository.prototype.findLatestByQuery = (query, done) => {
  return DatasetTransactions
    .find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error, transactions) => {
      return done(error, _.first(transactions));
    });
};

module.exports = new DatasetTransactionsRepository();
