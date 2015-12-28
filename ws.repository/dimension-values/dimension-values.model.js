'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} DimensionValues
 * @memberof Models
 *
 * @property {Models.Dimensions} dimension - corresponding dimension
 * @property {String} value - dimension value
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this dimension values
 * was created and modified
 */
var DimensionValues = new Schema({
  // should be required
  dimensionGid: String,
  dimension: {type: Schema.Types.ObjectId, ref: 'Dimensions'},
  value: String,
  title: String
});

DimensionValues.index({dimension: 1, value: 1});
DimensionValues.index({dimensionGid: 1, value: 1});
DimensionValues.index({value: 1});
DimensionValues.index({title: 1});

module.exports = mongoose.model('DimensionValues', DimensionValues);
