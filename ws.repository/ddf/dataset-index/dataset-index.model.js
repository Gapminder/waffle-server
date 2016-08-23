'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

/**
 * @typedef {Object} DatasetIndex
 * @memberof Models
 *
 * @property {Array<String>} key - type
 * @property {String} value - type value
 * @property {Array<String>} source - filename
 * @property {Array<String>} keyOriginIds - type
 * @property {String} valueOriginId - type value
 * @property {String} type - element type ['concepts','entities','datapoints']
 *
 *
 * @property {Number} from - entity start version
 * @property {Number} to - entity end version (or Infinity)
 * @property {Models.Datasets} dataset - reference
 * @property {Models.DatasetIndex} transaction - reference
 */
let DatasetIndex = new Schema({
  key: [{type: String, required: true}],
  value: {type: String, required: true},
  source: [{type: String, required: true}],
  keyOriginIds: [{type: String}],
  valueOriginId: {type: String},
  type: {type: String, enum: ['concepts','entities','datapoints']},

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetIndex', required: true}
}, { strict: false });

DatasetIndex.plugin(originId, {
  modelName: 'DatasetIndex',
  originId: 'DatasetIndex'
});

DatasetIndex.index({dataset: 1, from: 1, to: 1, measure: 1, dimensions: 1});
DatasetIndex.index({dataset: 1, transaction: 1, measure: 1});
DatasetIndex.index({dataset: 1, transaction: 1, originId: 1});
DatasetIndex.index({originId: 1, dataset: 1, transaction: 1});

module.exports = mongoose.model('DatasetIndex', DatasetIndex);
