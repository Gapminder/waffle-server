'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Entities
 * @memberof Models
 *
 * @property {String} gid - entity value
 * @property {String} title - nice name for entity
 * @property {Array<String>} sources - filenames of source item
 * @property {Boolean} isOwnParent - indicator that this entity is its own parent
 * @property {Object} properties - all properties from data set
 *
 * @property {Models.Concepts} domain - of entity, reference to only one entity domain from Concepts collection
 * @property {Array<Models.Concepts>} groups - of entity, in which entity takes part of
 * @property {Array<Models.Entities>} drilldowns - to lower-tier authorities (entity)
 * @property {Array<Models.Entities>} drillups - to higher authorities (entity)
 *
 * @property {Array<Models.DatasetVersions>} versions - all versions of data set in which the entity was added
 * @property {Models.Entity} previous - of current entity (could be null)
 */
let Entities = new Schema({
  gid: {type: String, match: /^[a-zA-Z0-9\/\._-]*$/, index: true, required: true},
  title: String,
  sources: [String],
  isOwnParent: Boolean,
  properties: {},

  // should be required
  domain: {type: Schema.Types.ObjectId, ref: 'Concepts'},
  groups: [{type: Schema.Types.ObjectId, ref: 'Concepts'}],
  childOf: [{type: Schema.Types.ObjectId, ref: 'Entities'}],

  versions: [{type: Schema.Types.ObjectId, ref: 'DatasetVersions'}],
  previous: {type: Schema.Types.ObjectId, ref: 'Entities', sparse: true}
});

Entities.index({gid: 1, domain: 1});
Entities.index({gid: 1, sets: 1});
Entities.index({gid: 1, versions: 1});
Entities.index({gid: 1, drilldowns: 1});
Entities.index({gid: 1, drillups: 1});

module.exports = mongoose.model('Entities', Entities);
