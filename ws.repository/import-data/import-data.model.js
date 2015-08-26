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
  // todo: rename
  d: String,
  v: String,
  // todo: to
  // dimension name specific to data source type
  dimension: String,
  value: String
}, {_id: false});

/**
 * @typedef {Object} ImportData
 * @memberof Models
 *
 * @property {Array<Dimension>} ds - dimensions, list of dimension pointers
 * @property {String|Number} v - observed value
 *
 * @property {Array<Models.ImportSessions>} importSession - point observed in several import sessions
 */
var ImportData = new Schema({
  // todo: rename
  ds: [DimensionSchema],
  v: String,
  // todo: to
  coordinates: [DimensionSchema],
  value: String,

  // todo: add
  dataSources: [{type: Schema.Types.ObjectId, ref: 'DataSources'}],
  catalogVersions: [{type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'}],

  importSessions: [{type: Schema.Types.ObjectId, ref: 'ImportSessions'}]
});

ImportData.index({'ds.d': 1, 'ds.v': 1, v: 1});

mongoose.model('ImportData', ImportData);
