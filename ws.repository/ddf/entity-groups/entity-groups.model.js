'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} EntityGroups
 * @memberof Models
 *
 * @property {String} gid - unique entityGroup gid within dataSetVersion
 * @property {String} name - unique entityGroup name within dataSetVersion
 * @property {String} tooltip - nice name for entityGroup

 * @property {Models.EntityGroup} parent - of current entityGroup (could be null)
 *
 * @property {Object} properties - all properties from data set
 * @property {Object} meta - any meta for entityGroup
 *
 * @property {Array<Models.DataSetVersions>} dataSetVersions - all versions of data set in which the entityGroup was added
 * @property {Models.EntityGroup} previousValue - of current entityGroup (could be null)
 */

let EntityGroups = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},

  name: {type: String, required: true, index: true},
  type: {type: String, 'enum': ['entity_domain', 'entity_set', 'time'], required: true},

  tooltip: String,
  link: String,

  parent: {type: Schema.Types.ObjectId, ref: 'EntityGroups', sparse: true},

  properties: {},
  meta: {},

  // system marks
  dataSetVersions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],

  previousValue: {type: Schema.Types.ObjectId, ref: 'EntityGroups', sparse: true}
});

EntityGroups.index({dataSetVersions: 1});
EntityGroups.index({gid: 1, dataSetVersions: 1});

module.exports = mongoose.model('EntityGroups', EntityGroups);
