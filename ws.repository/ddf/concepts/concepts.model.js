'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef CoordinateSchema
 * @memberof Concepts
 * @class
 *
 * @property {String} nodeId - reference id to neo4j node
 * @property {String} gid - concept identificator
 * @property {String} name - human-readable name of the concept
 * @property {String} type - can be on of the following: 'entity_set', 'entity_domain', 'time', 'string', 'measure'. By default 'string' will be used
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
 * @property {Models.Concepts} domain - of current entity set (could be null only for entity domain)
 * @property {Array<Models.Concepts>} drillups - to lower-tier authorities, entity sets (could be null)
 * @property {Array<Models.Concepts>} drilldowns - to higher authorities, entity sets (could be null)
 * @property {Array<Models.Concepts>} dimensions - list of all dimensions which were got in data-points files
 *
 * @property {Array<Models.DatasetVersions>} versions - all versions of data set in which the entity was added
 * @property {Models.Concepts} previous - a link to previous version of the current entity
 */

const ConceptsSchema = new Schema({
  nodeId: {type: Number, index: true, sparse: true},
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  name: {type: String, required: true, index: true},
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
  domain: {type: Schema.Types.ObjectId, ref: 'Concepts', sparse: true},
  drillups: [{type: Schema.Types.ObjectId, ref: 'Concepts'}],
  drilldowns: [{type: Schema.Types.ObjectId, ref: 'Concepts'}],
  dimensions: [{type: Schema.Types.ObjectId, ref: 'Concepts'}],

  versions: [{type: Schema.Types.ObjectId, ref: 'DatasetVersions'}],
  previous: {type: Schema.Types.ObjectId, ref: 'Concepts', sparse: true}
});

ConceptsSchema.index({type: 1});
ConceptsSchema.index({domain: 1});
ConceptsSchema.index({gid: 1, type: 1});

module.exports = mongoose.model('Concepts', ConceptsSchema);
