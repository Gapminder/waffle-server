'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} DataSets
 * @memberof Models
 *
 * @property {String} dsId - unique data set `id` within DataSets space
 * @property {String} type - github commit, local storage, etc
 * @property {String} uri - uri to Data Set (if exists)
 *
 * @property {Object} defaultLanguage - for Translation collection
 * @property {Object} meta - any metadata related to Data Set

 * @property {Models.DataProviders} dataProvider - of data set
 *
 * @property {Models.User} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this DataSet was created
 */
let DataSets = new Schema({
  dsId: {type: String, required: true, unique: true, index: true},
  type: {type: String, required: true},
  uri: {type: String, required: true},

  defaultLanguage: {type: String},
  meta: {},

  dataProvider: {type: String, required: true, sparse: true},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true},
});

DataSets.index({dsId: 1});

module.exports = mongoose.model('DataSets', DataSets);
