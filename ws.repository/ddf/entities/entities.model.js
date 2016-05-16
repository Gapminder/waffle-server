'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Entities
 * @memberof Models
 *
 * @property {String} gid - entity value
 * @property {String} originId - reference id to origin concept
 *
 * @property {String} title - nice name for entity
 * @property {Array<String>} sources - filenames of source item
 * @property {Boolean} isOwnParent - indicator that this entity is its own parent
 * @property {Object} properties - all properties from data set
 *
 * @property {Models.Concepts.originId} domain - of entity, reference to only one entity domain from Concepts collection
 * @property {Array<Models.Concepts.originId>} sets - of entity, in which entity takes part of
 * @property {Array<Models.Entities.originId>} drillups - to higher authorities (entity)
 *
 * @property {Number} from - entity start version
 * @property {Number} to - entity end version (or Infinity)
 * @property {Models.Datasets} dataset - reference
 * @property {Models.DatasetTransactions} transaction - reference
 */
let Entities = new Schema({
  gid: {type: String, match: /^[a-zA-Z0-9\/\._-]*$/, index: true, required: true},
  originId: Schema.Types.ObjectId,

  title: String,
  sources: [String],
  isOwnParent: Boolean,
  properties: {},

  // should be required
  domain: {type: Schema.Types.ObjectId},
  sets: [{type: Schema.Types.ObjectId}],
  drillups: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_VALUE},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets'},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions'}
});

Entities.index({gid: 1, domain: 1});
Entities.index({gid: 1, sets: 1});
Entities.index({gid: 1, versions: 1});
Entities.index({gid: 1, drilldowns: 1});
Entities.index({gid: 1, drillups: 1});

module.exports = mongoose.model('Entities', Entities);
