'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {Object} DataSetVersions
 * @memberof Models
 *
 * @property {Object} isCurrent - the version is now in neo4j

 * @property {Models.User} createdBy - user who added this Data Set entry
 * @property {Date} createdAt - timestamp when this DataSet was created
 */
const VersionsSchema = new Schema({
  value: String,
  status: { type: String, enum: ['IMPORTED', 'PUBLISHED', 'WORK_IN_PROGRESS'], default: 'WORK_IN_PROGRESS'},

  isCurrent: Boolean,

  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true}

  basedOn: {type: Schema.Types.ObjectId, ref: 'Versions'}
});

VersionsSchema.index({value: 1});
VersionsSchema.index({status: 1});

module.exports = mongoose.model('DataSetVersions', VersionsSchema);
