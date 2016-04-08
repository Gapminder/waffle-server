'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef CoordinateSchema
 * @memberof Concepts
 * @class
 *
 * @property {String} gid - concept identificator
 *
 * @property {String} name - human-readable name of the concept
 * @property {String} type - can be on of the following: 'entity_set', 'entity_domain', 'time', 'string', 'measure'. By default 'string' will be used
 * @property {String} tooltip - additional information regarding concept
 * @property {String} indicatorUrl - url that points to concept definition and explanation
 * @property {String} domain - name of the domain concept belongs to
 * @property {Object} properties - all properties from source
 *
 * @property {Array<Models.DataSetVersions>} versions - all versions of data set in which the entity was added
 * @property {Object} previous - a link to previous version of the current entity
 */
const ConceptsSchema = new Schema({
  gid: String,
  name: String,
  type: { type: String, enum: ['entity_set', 'entity_domain', 'time', 'string', 'measure'], 'default': 'string'},
  tooltip: String,
  indicatorUrl: String,
  domain: String,
  properties: {},

  versions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],
  previous: {type: Schema.Types.ObjectId, ref: 'Concepts', sparse: true}
});

ConceptsSchema.index({type: 1});
ConceptsSchema.index({domain: 1});
ConceptsSchema.index({gid: 1, type: 1});

module.exports = mongoose.model('Concepts', ConceptsSchema);
