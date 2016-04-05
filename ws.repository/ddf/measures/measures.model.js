'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Measures
 * @memberof Models
 *
 * @property {String} name - unique measure name within dataSetVersion, lowercase
 * @property {String} tooltip - nice name for measure
 *
 * @property {Object} meta - any meta for measure
 * @property {Object} properties - all properties from data set
 *
 * @property {Array<Models.EntityGroups>} entityGroups - array of Entity Domains/Sets (geo-year, city-time, etc)
 * @property {Array<Models.DataSetVersions>} dataSetVersions - all versions of data set in which the measure was added
 * @property {<Models.Measures>} previousValue - of current measure (could be null)
 */
var Measures = new Schema({
  nodeId: {type: Number, index: true, sparse: true},
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  name: String,
  tooltip: String,
  type: String,
  link: String,
  properties: {},

  tags: [String],
  meta: {},

  // todo: separate collection to manage units?
  unit: String,
  scales: [String],

  entityGroups: [{type: Schema.Types.ObjectId, ref: 'EntityGroups'}],
  dataSetVersions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],

  previousValue: {type: Schema.Types.ObjectId, ref: 'Measures', sparse: true}
});

Measures.index({dataSetVersions: 1});
Measures.index({gid: 1, dataSetVersions: 1});

module.exports = mongoose.model('Measures', Measures);
