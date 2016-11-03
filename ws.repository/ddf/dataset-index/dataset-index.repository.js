'use strict';

const mongoose = require('mongoose');
const DatasetIndex = mongoose.model('DatasetIndex');

function DatasetIndexRepository() {}

DatasetIndexRepository.prototype.findByDdfql = function (query, onFound) {
  return DatasetIndex.find(query.where, query.select).lean().exec(onFound);
};

DatasetIndexRepository.prototype.create = function (indexOrBatchIndexes, onCreated) {
  return DatasetIndex.create(indexOrBatchIndexes, onCreated);
};

module.exports = new DatasetIndexRepository();


