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
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, unique: true, required: true},
  // name versions
  name: {type: String, required: true, unique: true, index: true},
  nameShort: String,
  nameLong: String,
  // name in plural
  plural: String,
  pluralShort: String,
  pluralLong: String,
  // description
  description: String,
  link: String,

  // 1 - easy, 2 - average, 3 - complex
  usability: Number,
  type: {type: String, 'enum': ['entity_domain', 'entity_set'], required: true},
  tooltip: String,
  subdimOf: String,

  totalEntity: String,
  totalName: String,

  defaultEntities: [String],
  drilldowns: String,
  drillups: String,
  incompleteDrillups: String,

  ordinal: Boolean,
  measure: String,
  interval: Boolean,
  cardinality: Number,

  aliases: [String],
  pattern: String,
  ddfInheritance: String,
  meta: {},

  // todo: should be linked from dataSource, catalogVersion, analysisSessions

  // system marks
  dataSources: [{type: Schema.Types.ObjectId, ref: 'DataSources'}],
  catalogVersions: [{type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'}]
});

module.exports = mongoose.model('Dimensions', Dimensions);
