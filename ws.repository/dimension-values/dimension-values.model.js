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
  dimension: {type: Schema.Types.ObjectId, refs: 'Dimensions'},
  value: String,

  analysisSessions: [{type: Schema.Types.ObjectId, refs: 'AnalysisSessions'}]
});

DimensionValues.index({dimension: 1, value: 1});

mongoose.model('DimensionValues', DimensionValues);
