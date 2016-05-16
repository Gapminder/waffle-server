'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef DimensionSchema
 * @memberof Models
 * @class
 *
 * @param {String} entityName - established entity name
 * @param {String} value - of entity

 * @param {String} entityGroup - of entity which was specified in ddf's file name
 */
let DimensionSchema = new Schema({
  gid: String,
  conceptGid: String,

  concept: {type: Schema.Types.ObjectId, ref: 'Concepts'},
  entity: {type: Schema.Types.ObjectId, ref: 'Entities'}
}, {_id: false});

/**
 * @typedef {Object} DataPoints
 * @memberof Models
 *
 * @property {String} value - data this DataPoint contains at the given coordinates
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
  value: String,

  isNumeric: Boolean,
  measure: {type: Schema.Types.ObjectId},
  dimensions: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_VALUE},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets'},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions'}
});

DataPoints.index({measure: 1, dimensions: 1, value: 1, from: 1, to: 1});
DataPoints.index({value: 1, from: 1, to: 1});
DataPoints.index({value: 1, dataset: 1, transaction: 1});

module.exports = mongoose.model('DataPoints', DataPoints);
