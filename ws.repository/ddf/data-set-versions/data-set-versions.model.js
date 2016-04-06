'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} DataSetVersions
 * @memberof Models
 *
 * @property {Object} value - version's value
 * @property {String} status - signifies state of the version - might be one of the following: 'IMPORTED', 'PUBLISHED', 'WORK_IN_PROGRESS'. By default 'WORK_IN_PROGRESS' is used
 * @property {Object} isCurrent - the version is now in neo4j
 * @property {Models.User} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this DataSet was created
 * @property {Object} basedOn - version from which current version is originate or in other words - parent version or origin.
 */
const VersionsSchema = new Schema({
  value: String,
  status: { type: String, enum: ['IMPORTED', 'PUBLISHED', 'WORK_IN_PROGRESS'], 'default': 'WORK_IN_PROGRESS'},

  isCurrent: Boolean,

  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true},

  basedOn: {type: Schema.Types.ObjectId, ref: 'Versions'}
});

VersionsSchema.index({value: 1});
VersionsSchema.index({status: 1});

module.exports = mongoose.model('DataSetVersions', VersionsSchema);
