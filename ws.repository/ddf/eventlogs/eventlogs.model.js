'use strict';

const mongoose = require('mongoose');

/**
 * @typedef {Object} Eventlogs
 * @memberof Models
 *
 * @property {Object} collectionName - name of the collection which document was changed
 * @property {Object} document - document that contains changes
 * @property {Date} createdAt - timestamp when this Changelog record was created
 * @property {String} action - signifies an action that is done to dataset entry - might be one of the following: 'INSERT', 'UPDATE', 'REMOVE'.
 */
const Schema = mongoose.Schema;
const EventlogsSchema = new Schema({
  request: String,
  response: {},
  action: String,
  status: { type: String, enum: ['STARTED', 'SUCCEEDED', 'FAILED'], 'default': 'SUCCEEDED'},
  createdAt: {type: Date, 'default': new Date(), required: true},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  session: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions', required: true}
});

EventlogsSchema.index({collectionName: 1});
EventlogsSchema.index({action: 1});

module.exports = mongoose.model('Eventlogs', EventlogsSchema);
