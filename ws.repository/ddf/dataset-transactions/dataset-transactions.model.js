'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} DatasetTransactions
 * @memberof Models
 *
 * @property {String} name - transaction's name (human readable)
 * @property {Boolean} isClosed - the transaction is finished successfull
 *
 * @property {Models.Users} createdBy - this transaction's owner
 * @property {Date} createdAt - timestamp when this DatasetTransaction was created
 *
 * @property {Models.Datasets} dataset - of version, could be only one
 */
const DatasetTransactions = new Schema({
  name: {type: String, required: true, unique: true, index: true},
  isClosed: {type: Boolean, 'default': false},
  isDefault: {type: Boolean, 'default': false},
  lastError: {type: String},

  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Number, 'default': (new Date()).valueOf(), required: true},

  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets'},

  commit: {type: String}
});

DatasetTransactions.index({dataset: 1, commit: 1});
DatasetTransactions.index({dataset: 1, isClosed: 1});
DatasetTransactions.index({createdBy: 1, isDefault: 1});

module.exports = mongoose.model('DatasetTransactions', DatasetTransactions);
