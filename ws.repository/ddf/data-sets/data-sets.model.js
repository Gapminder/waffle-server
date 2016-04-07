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
 * @property {Object} meta - any metadata related to Data Set

 * @property {Models.DataProviders} dataProvider - of data set
 *
 * @property {Models.User} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this DataSet was created
 * @property {Date} translations - set of strings for a particular language which current data set uses to describe concepts in different languages.
 */
let DataSets = new Schema({
  dsId: {type: String, required: true, unique: true, index: true},
  type: {type: String, required: true},
  uri: {type: String, required: true},

  meta: {},

  dataProvider: {type: String, required: true, sparse: true},
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true},
  translations: [{type: Schema.Types.ObjectId, ref: 'Translations'}]
});

DataSets.index({dsId: 1, versions: 1});
DataSets.index({versions: 1});

module.exports = mongoose.model('DataSets', DataSets);
