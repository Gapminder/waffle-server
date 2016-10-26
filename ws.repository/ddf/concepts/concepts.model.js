'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

/**
 * @typedef CoordinateSchema
 * @memberof Concepts
 * @class
 *
 * @property {String} gid - concept identificator (should be unique by dataset and version)
 * @property {String} originId - reference id to origin concept
 *
 * @property {String} title - human-readable name of the concept
 * @property {String} type - can be on of the following: 'entity_set', 'entity_domain', 'string', 'measure'. By default 'string' will be used
 * @property {Array<String>} sources - filenames of source item
 *
 * @property {Array<String>} tags - additional information regarding concept with type measure
 * @property {String} tooltip - nice name for concept
 * @property {String} link - url that points to concept definition and explanation
 * @property {Object} color - default palette for concept (vizabi specific values)
 * @property {String} unit - unit of measurement (for entity_set and measure)
 * @property {Array<String>} scales - could be linear, log (and others)
 * @property {Object} metadata - metadata of concept could be complex object
 * @property {Object} properties - all properties from source
 *
 * @property {Boolean} isNumeric - indicate whether concept with type measure has only numeric values
 * @property {Models.Concepts.originId} domain - of current entity set (could be null only for entity domain)
 * @property {Array<Models.Concepts.originId>} subsetOf - to lower-tier authorities, entity sets (could be null)
 * @property {Array<Models.Concepts.originId>} dimensions - list of all entity_sets, entity_domains that belong to particular measure. Only measure has this prop populated.
 *
 * @property {Number} from - concept start version
 * @property {Number} to - concept end version (or Infinity)
 * @property {Models.Datasets} dataset - reference
 * @property {Models.DatasetTransactions} transaction - reference
 */

const Concepts = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  originId: {type: Schema.Types.ObjectId},

  type: {type: String, enum: ['entity_set', 'entity_domain', 'time', 'string', 'measure'], 'default': 'string', required: true},
  sources: [{type: String, required: true}],

  tags: [String],
  tooltip: String,
  indicatorUrl: String,
  color: {},
  unit: String,
  scales: [String],
  metadata: {},
  properties: {},
  languages: {},

  isNumeric: {type: Boolean, index: true, sparse: true},
  domain: {type: Schema.Types.ObjectId, sparse: true},
  subsetOf: [{type: Schema.Types.ObjectId}],
  dimensions: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions', required: true}
}, { strict: false });

Concepts.post('save', function (doc, next) {
  if (!doc.originId) {
    doc.originId = doc._id;
    mongoose.model('Concepts').update({ _id: doc._id }, { $set: { originId: doc._id } }, (error, result) => {
      next(error, result);
    });
  } else {
    next();
  }
});

Concepts.plugin(originId, {
  modelName: 'Concepts',
  domain: 'Concepts',
  subsetOf: 'Concepts',
  dimensions: 'Concepts',
  originId: 'Concepts'
});

Concepts.index({dataset: 1, from: 1, to: 1});
Concepts.index({dataset: 1, transaction: 1});
Concepts.index({originId: 1, dataset: 1, transaction: 1});
Concepts.index({originId: 1, dataset: 1, from: 1, to: 1});

module.exports = mongoose.model('Concepts', Concepts);
