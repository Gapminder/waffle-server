'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} OriginalEntities
 * @memberof Models
 *
 * @property {String} gid - entity value
 * @property {String} title - nice name for entity
 * @property {Array<String>} sources - filenames of source item
 *
 * @property {Object} properties - all properties from data set
 *
 * @property {Models.Concepts} domain - of entity, reference to only one entity domain from Concepts collection
 * @property {Array<Models.Concepts>} groups - of entity, in which entity takes part of
 *
 * @property {Array<Models.DatasetVersions>} versions - all versions of data set in which the entity was added
 */
let OriginalEntities = new Schema({
  gid: {type: String, match: /^[a-zA-Z0-9_-]*$/, index: true, required: true},
  title: String,
  sources: [String],

  properties: {},

  domain: {type: Schema.Types.ObjectId, ref: 'Concepts'},
  groups: [{type: Schema.Types.ObjectId, ref: 'Concepts'}],

  versions: [{type: Schema.Types.ObjectId, ref: 'DatasetVersions'}],
});

OriginalEntities.index({gid: 1, domain: 1});
OriginalEntities.index({gid: 1, sets: 1});
OriginalEntities.index({gid: 1, versions: 1});
OriginalEntities.index({gid: 1, drilldowns: 1});
OriginalEntities.index({gid: 1, drillups: 1});

module.exports = mongoose.model('OriginalEntities', OriginalEntities);
