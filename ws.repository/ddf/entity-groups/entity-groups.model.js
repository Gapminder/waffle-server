'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} EntityGroups
 * @memberof Models
 *
 * @property {String} gid - unique entityGroup gid within dataSetVersion
 *
 * @property {String} name - unique entityGroup name within dataSetVersion
 * @property {String} type - signifies a type of entity group - might be one of the following: 'entity_domain', 'entity_set', 'time'
 *
 * @property {String} tooltip - nice name for entityGroup
 * @property {String} link - link to source of entityGroup
 *
 * @property {Models.EntityGroup} domain - of current entity set (could be null only for entity domain)
 * @property {Array<Models.EntityGroup>} drillups - to lower-tier authorities, entity sets (could be null)
 * @property {Array<Models.EntityGroup>} drilldowns - to higher authorities, entity sets (could be null)
 *
 * @property {Object} properties - all properties from data set
 * @property {Object} meta - any meta for entityGroup
 *
 * @property {Array<Models.DataSetVersions>} versions - all versions of data set in which the entityGroup was added
 * @property {Models.EntityGroup} previous - of current entityGroup (could be null)
 */

let EntityGroups = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},

  name: {type: String, required: true, index: true},
  type: {type: String, 'enum': ['entity_domain', 'entity_set', 'time'], required: true},

  tooltip: String,
  link: String,

  domain: {type: Schema.Types.ObjectId, ref: 'EntityGroups', sparse: true},
  drillups: [{type: Schema.Types.ObjectId, ref: 'EntityGroups'}],
  drilldowns: [{type: Schema.Types.ObjectId, ref: 'EntityGroups'}],

  properties: {},
  meta: {},

  // system marks
  versions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],
  previous: {type: Schema.Types.ObjectId, ref: 'EntityGroups', sparse: true}
});

EntityGroups.index({versions: 1});
EntityGroups.index({gid: 1, versions: 1});

module.exports = mongoose.model('EntityGroups', EntityGroups);
