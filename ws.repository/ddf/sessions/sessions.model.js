'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} Sessions
 * @memberof Models
 *
 * @property {Object} version - signifies version this session belongs to
 * @property {String} status - signifies state of the session - might be one of the following: 'CLOSED', 'CANCELLED', 'CORRUPTED', 'CREATED', 'PENDING'. By default 'CREATED' is used
 * @property {Models.User} createdBy - this session's owner
 * @property {Date} createdAt - timestamp when this Sessions was created
 */
const SessionsSchema = new Schema({
  version: {type: Schema.Types.ObjectId, ref: 'DataSetVersions'},
  status: { type: String, enum: ['CLOSED', 'CANCELLED', 'CORRUPTED', 'CREATED', 'PENDING'], 'default': 'CREATED'},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true}
});

SessionsSchema.index({status: 1});
SessionsSchema.index({createdBy: 1});

module.exports = mongoose.model('Sessions', SessionsSchema);
