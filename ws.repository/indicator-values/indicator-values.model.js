'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @name DimensionsSet
 * @memberof Models
 * @class
 *
 * @param {String} d - dimension
 * @param {String} v - value
 */
var DimensionSchema = new Schema({
  dv: {type: Schema.Types.ObjectId, ref: 'DimensionValues'},
  d: {type: Schema.Types.ObjectId, ref: 'Dimensions'},
  v: String
}, {_id: false});

/**
 * @typeof {Object} IndicatorValues
 * @memberof Models
 *
 *
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this indicator was created and modified
 */
var IndicatorValues = new Schema({
  ds: [DimensionSchema],
  v: String,

  coordinates: {type: Schema.Types.ObjectId, ref: 'Coordinates'},
  indicator: {type: Schema.Types.ObjectId, ref: 'Indicators'},

  analysisSessions: [{type: Schema.Types.ObjectId, ref: 'AnalysisSessions'}]
});

IndicatorValues.index({'ds.d': 1, 'ds.v': 1, v: 1, coordinates: 1, indicator: 1});

mongoose.model('IndicatorValues', IndicatorValues);
