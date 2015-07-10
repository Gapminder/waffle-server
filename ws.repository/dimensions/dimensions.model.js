'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Dimensions
 * @memberof Models
 *
 * @property {String} name - unique dimension name, lowercase
 * @property {String} title - nice name for dimension
 *
 * @property {Object} meta - any meta for dimension
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this coordinates was created and modified
 */
var Dimensions = new Schema({
  name: {type: String, required: true, unique: true, index: true},
  title: String,

  meta: {},

  analysisSessions: [{type: Schema.Types.ObjectId, refs: 'AnalysisSessions'}]
});

mongoose.model('Dimensions', Dimensions);
