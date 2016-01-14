'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} DataSources
 * @memberof Models
 *
 * @property {Models.DataSourceTypes} dst - id of data source type
 * @property {String} dsuid - unique data source `id` within DataSource space
 *
 * @property {Object} meta - any metadata related to Data Source
 *
 * @property {Models.ImportSessions} user - user who added this Data Source entry
 * @property {Date} version - timestamp when this DataSource was created
 */
var DataSources = new Schema({
  // todo: rename and deprecate
  dst: {type: Schema.Types.ObjectId, ref: 'DataSourceTypes', required: true},
  dsuid: {type: String, required: true},
  // todo: into this correspondingly
  dataSourceType: {type: Schema.Types.ObjectId, ref: 'DataSourceTypes', required: true},
  uri: {type: String, required: true},

  // denormalized publisher catalog version
  publisher: {type: Schema.Types.ObjectId, ref: 'Publishers'},
  catalog: {type: Schema.Types.ObjectId, ref: 'PublisherCatalogs'},
  catalogVersion: {type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'},

  meta: {},
  // todo: rename and deprecate
  user: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  version: {type: Date, 'default': new Date(), required: true},
  // todo: to
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date(), required: true}
});

DataSources.index({dst: 1, dsuid: 1, version: 1});

mongoose.model('DataSources', DataSources);
