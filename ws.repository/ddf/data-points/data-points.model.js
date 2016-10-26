'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

/**
 * @typedef DimensionSchema
 * @memberof Models
 *
 * @param {Models.Concepts.originId} domain - established entity name
 * @param {Models.Entities.originId} entity - established entity name
 */
let DimensionSchema = new Schema({
  domain: {type: Schema.Types.ObjectId},
  entity: {type: Schema.Types.ObjectId}
}, {_id: false});

/**
 * @typedef {Object} DataPoints
 * @memberof Models
 *
 * @property {Mixed} value - data this DataPoint contains at the given coordinates
 * @property {Array<String>} sources - filenames of source item
 *
 * @property {Boolean} isNumeric - value of the measure?
 * @property {Models.Concepts.originId} measure - points to measure this DataPoint has value for
 * @property {Array<Models.Entities.originId>} dimensions - contains objects that are define point for the data
 *
 * @property {Number} from - entity start version
 * @property {Number} to - entity end version (or Infinity)
 * @property {Models.Datasets} dataset - reference
 * @property {Models.DatasetTransactions} transaction - reference
 */
let DataPoints = new Schema({
  value: {type: Schema.Types.Mixed, required: true},
  sources: [{type: String, required: true}],

  isNumeric: {type: Boolean, required: true},
  measure: {type: Schema.Types.ObjectId, required: true},
  dimensions: [{type: Schema.Types.ObjectId}],
  properties: {},
  languages: {},

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions', required: true}
}, { strict: false });

DataPoints.plugin(originId, {
  modelName: 'DataPoints',
  measure: 'Concepts',
  dimensions: 'Entities',
  originId: 'DataPoints'
});

DataPoints.index({dataset: 1, from: 1, to: 1, measure: 1, dimensions: 1});
DataPoints.index({dataset: 1, transaction: 1, measure: 1});
DataPoints.index({dataset: 1, transaction: 1, originId: 1});
DataPoints.index({originId: 1, dataset: 1, transaction: 1});

module.exports = mongoose.model('DataPoints', DataPoints);
