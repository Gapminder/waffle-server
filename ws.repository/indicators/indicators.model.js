'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typeof {Object} Indicators
 * @memberof Models
 *
 * @property {String} name - unique indicator name, lowercase
 * @property {String} title - nice name for indicator
 * @property {String} valueType - string representation of value type
 *
 * @property {Object} meta - any meta for indicator
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this indicator was created and modified

 */
var Indicators = new Schema({
  name: {type: String, unique: true, required: true, index: true},
  title: String,
  valueType: String,

  meta: {},

  analysisSessions: [{type: Schema.Types.ObjectId, refs: 'AnalysisSessions'}]
});

mongoose.model('Indicators', Indicators);
