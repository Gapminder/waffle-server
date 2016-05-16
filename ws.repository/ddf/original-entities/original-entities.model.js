'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} OriginalEntities
 * @memberof Models
 *
 * @property {String} gid - entity value
 *
 * @property {String} title - nice name for entity
 * @property {Array<String>} sources - filenames of source item
 * @property {Object} properties - all properties from data set
 *
 * @property {Models.Concepts} domain - of entity, reference to only one entity domain from Concepts collection
 * @property {Array<Models.Concepts>} sets - of entity, in which entity takes part of
 *
 */
let OriginalEntities = new Schema({
  gid: {type: String, match: /^[a-zA-Z0-9\/\._-]*$/, index: true, required: true},

  title: String,
  sources: [String],
  properties: {},

  // should be required
  domain: {type: Schema.Types.ObjectId},
  sets: [{type: Schema.Types.ObjectId}]
});

OriginalEntities.index({gid: 1, domain: 1});
OriginalEntities.index({gid: 1, sets: 1});

module.exports = mongoose.model('OriginalEntities', OriginalEntities);
