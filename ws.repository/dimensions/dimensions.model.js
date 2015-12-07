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
  //concept: {type: String, match: /^[a-z0-9_]*$/, index: true, unique: true, required: true},
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
  tags: [String],

  // 1 - easy, 2 - average, 3 - complex
  complexity: Number,
  type: {type: String, 'enum': 'dimension subdim'},
  // parent dimension gid, only if type === subdim
  parentDimension: String,

  // deprecate title - same as name
  title: String,

  meta: {},

  // todo: should be linked from dataSource, catalogVersion, analysisSessions

  // system marks
  dataSources: [{type: Schema.Types.ObjectId, ref: 'DataSources'}],
  catalogVersions: [{type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'}],

  analysisSessions: [{type: Schema.Types.ObjectId, ref: 'AnalysisSessions'}]
});

mongoose.model('Dimensions', Dimensions);
