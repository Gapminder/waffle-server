'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typeof {Object} IndicatorValues
 * @memberof Models
 *
 * @property {String} name - unique indicator name, lowercase
 * @property {String} title - nice name for indicator
 *
 * @property {Object} meta - any meta for indicator
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this indicator was created and modified
 */
var IndicatorValues = new Schema({
  ds: [{
    d: {type: Schema.Types.ObjectId, refs: 'Dimensions'},
    v: String
  }],
  indicator: {type: Schema.Types.ObjectId, refs: 'Indicators'},
  value: String,

  analysisSessions: [{type: Schema.Types.ObjectId, refs: 'AnalysisSessions'}]
});

mongoose.model('IndicatorValues', IndicatorValues);
