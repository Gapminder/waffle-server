'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typeof {Object} Indicators
 * @memberof Models
 *
 * @property {String} name - unique indicator name, lowercase
 * @property {String} title - nice name for indicator
 * @property {Array<Models.Coordinates>} coordinates - expression of dimensionality nature
 *
 * @property {Object} meta - any meta for indicator
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this indicator was created and modified

 */
var Indicators = new Schema({
  name: {type: String, unique: true, required: true, index: true},
  title: String,

  coordinates: [{type: Schema.Types.ObjectId, ref: 'Coordinates'}],

  meta: {},

  analysisSessions: [{type: Schema.Types.ObjectId, ref: 'AnalysisSessions'}]
});

mongoose.model('Indicators', Indicators);
