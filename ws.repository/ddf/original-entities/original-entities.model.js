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
 * @property {Number} from - entity start version
 * @property {Number} to - entity end version (or Infinity)
 * @property {Models.Datasets} dataset - reference
 * @property {Models.DatasetTransactions} transaction - reference
 */
let OriginalEntities = new Schema({
  gid: {type: String, match: /^[a-zA-Z0-9\/\._-]*$/, index: true, required: true},

  title: String,
  sources: [{type: String, required: true}],
  properties: {},

  // should be required
  domain: {type: Schema.Types.ObjectId, required: true},
  sets: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions', required: true}

}, { strict: false });

OriginalEntities.index({gid: 1, domain: 1});
OriginalEntities.index({gid: 1, sets: 1});

module.exports = mongoose.model('OriginalEntities', OriginalEntities);
