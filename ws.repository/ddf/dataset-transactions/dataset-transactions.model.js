'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DatasetTransactions = new Schema({
  isClosed: {type: Boolean, default: false},
  isDefault: {type: Boolean, default: false},
  lastError: {type: String},

  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Number, default: Date.now, required: true},

  timeSpentInMillis: Number,
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets'},
  defaultLanguage: {type: String},
  languages: [{type: String}],

  commit: {type: String, required: true}
});

DatasetTransactions.index({dataset: 1, commit: 1});
DatasetTransactions.index({dataset: 1, isClosed: 1});
DatasetTransactions.index({createdBy: 1, isDefault: 1});

module.exports = mongoose.model('DatasetTransactions', DatasetTransactions);
