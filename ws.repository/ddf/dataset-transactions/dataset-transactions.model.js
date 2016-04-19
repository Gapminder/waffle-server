'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} DatasetTransactions
 * @memberof Models
 *
 * @property {Object} version - signifies version this session belongs to
 * @property {String} status - signifies state of the session - might be one of the following: 'CLOSED', 'CANCELLED', 'CORRUPTED', 'CREATED', 'PENDING'. By default 'CREATED' is used
 * @property {Models.User} createdBy - this session's owner
 * @property {Date} createdAt - timestamp when this DatasetTransaction was created
 */
const DatasetTransactions = new Schema({
  version: {type: Schema.Types.ObjectId, ref: 'DatasetVersions'},
  status: { type: String, enum: ['CLOSED', 'CANCELLED', 'CORRUPTED', 'CREATED', 'PENDING', 'IMPORTED'], 'default': 'CREATED'},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true}
});

DatasetTransactions.index({status: 1});
DatasetTransactions.index({createdBy: 1});

module.exports = mongoose.model('DatasetTransactions', DatasetTransactions);
