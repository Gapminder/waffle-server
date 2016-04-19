'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} DatasetVersions
 * @memberof Models
 *
 * @property {Object} name - version's name
 * @property {String} status - signifies state of the version - might be one of the following: 'IMPORTED', 'PUBLISHED', 'WORK_IN_PROGRESS'. By default 'WORK_IN_PROGRESS' is used
 *
 * @property {Object} isCurrent - the version is now in neo4j
 *
 * @property {Models.User} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this Dataset was created
 *
 * @property {Models.Datasets} dataset - of version, could be only one
 * @property {Models.DatasetVersions} basedOn - version from which current version is originate or in other words - parent version or origin.
 */
const DatasetVersions = new Schema({
  name: {type: String, required: true},
  status: { type: String, enum: ['IMPORTED', 'PUBLISHED', 'WORK_IN_PROGRESS'], 'default': 'WORK_IN_PROGRESS'},

  isCurrent: {type: Boolean, 'default': false},

  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true},

  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets'},
  basedOn: {type: Schema.Types.ObjectId, ref: 'DatasetVersions'}
});

DatasetVersions.index({value: 1});
DatasetVersions.index({status: 1});

module.exports = mongoose.model('DatasetVersions', DatasetVersions);
