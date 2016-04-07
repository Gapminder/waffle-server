'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

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
 * @property {Array<Models.DataSetVersions>} dataSetVersions - all versions of data set in which the measure was added
 * @property {<Models.Measures>} previous - of current measure (could be null)
 */
let Measures = new Schema({
  nodeId: {type: Number, index: true, sparse: true},
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  name: String,
  tooltip: String,
  type: String,
  link: String,
  properties: {},

  tags: [String],
  meta: {},

  unit: String,
  scales: [String],

  dataSetVersions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],

  previous: {type: Schema.Types.ObjectId, ref: 'Measures', sparse: true}
});

Measures.index({dataSetVersions: 1});
Measures.index({gid: 1, dataSetVersions: 1});

module.exports = mongoose.model('Measures', Measures);
