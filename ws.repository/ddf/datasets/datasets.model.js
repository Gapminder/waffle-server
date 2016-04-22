'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Datasets
 * @memberof Models
 *
 * @property {String} dsId - unique data set `id` within Datasets space (human readable)
 * @property {String} type - github commit, local storage, etc
 * @property {String} uri - uri to Data Set (if exists)
 *
 * @property {Object} defaultLanguage - for Translation collection
 * @property {Object} meta - any metadata related to Data Set

 * @property {Models.DataProviders} dataProvider - of data set
 *
 * @property {Models.User} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this Dataset was created
 */
let Datasets = new Schema({
  dsId: {type: String, required: true, unique: true, index: true},
  type: {type: String, required: true},
  url: {type: String, required: true},
  commit: {type: String},

  defaultLanguage: {type: String, required: true},
  metadata: {},

  isLocked: {type: Boolean, default: false},
  lockedAt: {type: Date, 'default': new Date()},
  lockedBy: {type: Schema.Types.ObjectId, ref: 'Users'},

  dataProvider: {type: String, required: true, sparse: true},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true}
});

Datasets.index({dsId: 1});

module.exports = mongoose.model('Datasets', Datasets);
