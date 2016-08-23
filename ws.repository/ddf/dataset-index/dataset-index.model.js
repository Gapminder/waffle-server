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

  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetIndex', required: true}
}, { strict: false });

DatasetIndex.index({transaction: 1});
DatasetIndex.index({key: 1});
DatasetIndex.index({value: 1});
DatasetIndex.index({type: 1});

module.exports = mongoose.model('DatasetIndex', DatasetIndex);

