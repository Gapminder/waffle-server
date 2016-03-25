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
  nodeId: {type: Number, index: true, sparse: true},
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, unique: true, required: true},
  tooltip: String,
  link: String,
  properties: {},

  title: String,

  name: String,
  nameShort: String,
  nameLong: String,

  description: String,
  definitionSnippet: String,

  lowLabelShort: String,
  lowLabel: String,

  highLabelShort: String,
  highLabel: String,

  goodDirection: String,

  usability: Number,

  valueInterval: String,
  scales: [String],
  precisionMaximum: Number,
  decimalsMaximum: Number,

  tags: [String],
  meta: {},

  // todo: separate collection to manage units?
  unit: String,
  // ???
  dimensions: [{type: Schema.Types.ObjectId, ref: 'Dimensions'}],

  // system marks
  dataSources: [{type: Schema.Types.ObjectId, ref: 'DataSources'}],
  catalogVersions: [{type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'}]
});

Indicators.index({gid: 1});
module.exports = mongoose.model('Indicators', Indicators);
