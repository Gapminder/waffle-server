'use strict';

const async = require('async');
const mongoose = require('mongoose');
const DatasetIndex = mongoose.model('DatasetIndex');

const constants = require('../../../ws.utils/constants');

function DatasetIndexRepository() {}

DatasetIndexRepository.prototype.findByDdfql = function (query, onFound) {
  return DatasetIndex.find(query.where, query.select).lean().exec(onFound);
};

DatasetIndexRepository.prototype.create = function (indexOrBatchIndexes, onCreated) {
  indexOrBatchIndexes = Array.isArray(indexOrBatchIndexes) ? indexOrBatchIndexes : [indexOrBatchIndexes];
  return DatasetIndex.insertMany(indexOrBatchIndexes, onCreated);
};

DatasetIndexRepository.prototype.rollback = function ({_id: transactionId}, onRolledback) {
  return DatasetIndex.remove({'transaction': transactionId}, onRolledback);
};

DatasetIndexRepository.prototype.removeByDataset = function (datasetId, onRemove) {
  return DatasetIndex.remove({dataset: datasetId}, onRemove);
};

module.exports = new DatasetIndexRepository();


