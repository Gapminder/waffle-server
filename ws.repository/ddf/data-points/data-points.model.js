'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

const DataPoints = new Schema({
  value: {type: Schema.Types.Mixed, required: true},
  sources: [{type: String, required: true}],

  isNumeric: {type: Boolean, required: true},
  measure: {type: Schema.Types.ObjectId, required: true},
  dimensions: [{type: Schema.Types.ObjectId}],
  properties: {type: Schema.Types.Mixed, default: {}},
  languages: {type: Schema.Types.Mixed, default: {}},

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
}, { strict: false, minimize: false });

DataPoints.plugin(originId, {
  modelName: 'DataPoints',
  measure: 'Concepts',
  dimensions: 'Entities',
  originId: 'DataPoints'
});

DataPoints.index({dataset: 1, from: 1, to: 1, measure: 1, dimensions: 1, value: 1});
DataPoints.index({from: 1});
DataPoints.index({to: 1});
DataPoints.index({originId: 1});

module.exports = mongoose.model('DataPoints', DataPoints);
