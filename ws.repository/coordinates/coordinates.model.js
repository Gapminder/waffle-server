'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Coordinates
 * @memberof Models
 *
 * @property {String} [name] - optional name for this coordinates
 * @property {Array<Models.Dimensions>} dimensions - set of dimensions
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this coordinates was created and modified
 */
var Coordinates = new Schema({
  name: String,
  dimensions: [{type: Schema.Types.ObjectId, refs: 'Dimensions'}],

  analysisSessions: [{type: Schema.Types.ObjectId, refs: 'AnalysisSessions'}]
});

mongoose.model('Coordinates', Coordinates);
