'use strict';

const mongoose = require('mongoose');
const DatasetIndex = mongoose.model('DatasetIndex');

function DatasetIndexRepository() {}

DatasetIndexRepository.prototype.findByDdfql = function (query, onFound) {
  return DatasetIndex.find(query.where, query.select).lean().exec(onFound);
};

module.exports = new DatasetIndexRepository();


