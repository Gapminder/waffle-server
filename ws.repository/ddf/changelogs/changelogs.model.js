'use strict';

const mongoose = require('mongoose');

/**
 * @typedef {Object} Changelogs
 * @memberof Models
 *
 * @property {Object} collectionName - name of the collection which document was changed
 * @property {Object} document - document that contains changes
 * @property {Date} createdAt - timestamp when this Changelog record was created
 * @property {String} action - signifies an action that is done to dataset entry - might be one of the following: 'INSERT', 'UPDATE', 'REMOVE'.
 */
const Schema = mongoose.Schema;
const ChangelogsSchema = new Schema({
  collectionName: String,
  document: {},
  createdAt: {type: Date, 'default': new Date(), required: true},
  action: {type: String, enum: ['INSERT', 'UPDATE', 'REMOVE'], required: true},
  session: {type: Schema.Types.ObjectId, ref: 'Sessions', required: true}
});

ChangelogsSchema.index({collectionName: 1});
ChangelogsSchema.index({action: 1});

module.exports = mongoose.model('Changelogs', ChangelogsSchema);
