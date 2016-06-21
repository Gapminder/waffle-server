'use strict';
var _ = require('lodash');

const mongoose = require('mongoose');

const Datasets = mongoose.model('Datasets');
const Transactions = mongoose.model('DatasetTransactions');

module.exports = {
  getDataset,
  getVersion
};

function getDataset(pipe, done) {
  let query = { name: pipe.datasetName || process.env.DEFAULT_DATASET_NAME || 'ddf--gapminder_world-stub-4' };
  Datasets.findOne(query)
    .lean()
    .exec((err, dataset) => {
      if (!dataset) {
        return done(`Given dataset "${pipe.datasetName}" doesn't exist`);
      }

      pipe.dataset = dataset;

      return done(err, pipe);
    });
}

function getVersion(pipe, done) {
  let query = {
    dataset: pipe.dataset._id,
    isClosed: true
  };

  if (pipe.version) {
    query.createdAt = pipe.version;
  }

  Transactions.find(query)
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((err, transactions) => {
      if (!transactions || _.isEmpty(transactions)) {
        return done(`Given dataset version "${pipe.version}" doesn't exist`);
      }

      pipe.transaction = _.first(transactions);
      pipe.version = pipe.transaction.createdAt;

      return done(err, pipe);
    });
}
