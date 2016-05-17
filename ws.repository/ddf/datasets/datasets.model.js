'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Datasets
 * @memberof Models
 *
 * @property {String} name - unique data set `name` within Datasets space (human readable)
 * @property {String} type - github commit, local storage, etc
 * @property {String} path - path (url or local) to Data Set (if exists)
 * @property {String} commit - hash of commit on remote repo (if exists)
 *
 * @property {Object} defaultLanguage - for Translation collection
 * @property {Object} metadata - any metadata related to Data Set
 *
 * @property {Array<Number>} metadata - any metadata related to Data Set
 * @property {Boolean} isLocked - is this DataSet locked for adding new versions?
 * @property {Models.Users} lockedBy - user who locked this Data Set
 * @property {Date} lockedAt - timestamp when this Dataset was locked
 *
 * @property {Models.DataProviders} dataProvider - of many data sets
 * @property {Models.Users} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this Dataset was created
 */
let Datasets = new Schema({
  name: {type: String, required: true, unique: true, index: true},

  type: {type: String, required: true},
  path: {type: String, required: true},
  commit: {type: String},

  defaultLanguage: {type: String, required: true},
  metadata: {},

  versions: [{type: Number, unique: true}],
  isLocked: {type: Boolean, default: false},
  lockedAt: {type: Date, default: new Date()},
  lockedBy: {type: Schema.Types.ObjectId, ref: 'Users'},

  dataProvider: {type: String, required: true, sparse: true},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Number, 'default': (new Date()).valueOf(), required: true}
});

Datasets.index({dsId: 1});

module.exports = mongoose.model('Datasets', Datasets);
