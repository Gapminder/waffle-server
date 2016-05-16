'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
 * @property {Array<Models.Concepts.originId>} dimensions - list of all dimensions which were got in data-points files
 *
 * @property {Number} from - concept start version
 * @property {Number} to - concept end version (or Infinity)
 * @property {Models.Datasets} dataset - reference
 * @property {Models.DatasetTransactions} transaction - reference
 */

const ConceptsSchema = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  originId: {type: Schema.Types.ObjectId, required: true},

  title: {type: String, required: true, index: true},
  type: {type: String, enum: ['entity_set', 'entity_domain', 'time', 'string', 'measure'], 'default': 'string', required: true},

  tags: [String],
  tooltip: String,
  indicatorUrl: String,
  color: {},
  unit: String,
  scales: [String],
  metadata: {},
  properties: {},

  isNumeric: {type: Boolean, index: true, sparse: true},
  domain: {type: Schema.Types.ObjectId, sparse: true},
  subsetOf: [{type: Schema.Types.ObjectId}],
  dimensions: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_VALUE},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets'},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions'}
});

ConceptsSchema.index({type: 1});
ConceptsSchema.index({domain: 1});
ConceptsSchema.index({gid: 1, type: 1});

module.exports = mongoose.model('Concepts', ConceptsSchema);
