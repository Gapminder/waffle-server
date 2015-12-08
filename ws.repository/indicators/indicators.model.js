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
 * @property {Array<Models.Dimensions>} dimensions - set of dimensions
 *
 * @property {Object} meta - any meta for indicator
 *
 * @property {Array<Models.AnalysisSessions>} analysisSessions - when this indicator was created and modified

 */
var Indicators = new Schema({
  name: {type: String, unique: true, required: true, index: true},
  title: String,
  meta: {},

  // todo: separate collection to manage units?
  units: {name: String},
  dimensions: [{type: Schema.Types.ObjectId, ref: 'Dimensions'}],

  // system marks
  dataSources: [{type: Schema.Types.ObjectId, ref: 'DataSources'}],
  catalogVersions: [{type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'}],
  analysisSessions: [{type: Schema.Types.ObjectId, ref: 'AnalysisSessions'}]
});

module.exports = mongoose.model('Indicators', Indicators);
