'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

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
  gid: {type: Schema.Types.Mixed, match: /^[a-zA-Z0-9\/\._-]*$/, index: true, required: true},
  originId: {type: Schema.Types.ObjectId},

  title: String,
  sources: [{type: String, required: true}],
  isOwnParent: Boolean,
  properties: {},

  // should be required
  domain: {type: Schema.Types.ObjectId, required: true},
  sets: [{type: Schema.Types.ObjectId}],
  drillups: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions', required: true}
}, { strict: false });


Entities.plugin(originId, {
  modelName: 'Entities',
  domain: 'Concepts',
  sets: 'Concepts',
  drillups: 'Entities',
  originId: 'Entities'
});

Entities.index({dataset: 1, from: 1, to: 1, domain: 1});
// This index exists only for entities of type "time"
Entities.index({dataset: 1, from: 1, to: 1, domain: 1, 'parsedProperties.time.millis': 1, 'parsedProperties.time.timeType': 1}, {sparse: true});
Entities.index({dataset: 1, transaction: 1, originId: 1});
Entities.index({originId: 1, dataset: 1, transaction: 1});
Entities.index({originId: 1, dataset: 1, from: 1, to: 1});

module.exports = mongoose.model('Entities', Entities);
