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
  value: String,
  dimensionName: String,

  dimension: {type: Schema.Types.ObjectId, ref: 'Dimensions'},
  dimensionValue: {type: Schema.Types.ObjectId, ref: 'DimensionValues'}
}, {_id: false});

/**
 * @typeof {Object} IndicatorValues
 * @memberof Models
 */
var IndicatorValues = new Schema({
  coordinates: [DimensionSchema],
  value: String,

  indicator: {type: Schema.Types.ObjectId, ref: 'Indicators'},
  indicatorName: String
});

IndicatorValues.index({value: 1, 'coordinates.dimensionName': 1, 'coordinates.value': 1});
IndicatorValues.index({indicator: 1, value: 1});
IndicatorValues.index({indicator: 1, 'coordinates.dimension': 1, 'coordinates.value': 1});
IndicatorValues.index({indicatorName: 1, 'coordinates.dimensionName': 1, 'coordinates.value': 1});

module.exports = mongoose.model('IndicatorValues', IndicatorValues);
