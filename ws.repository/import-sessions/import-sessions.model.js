'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} ImportSessions
 * @memberof Models
 *
 * @property {Models.DataSourceTypes} dsid - Import Session of this DataSource
 * @property {Boolean} isApproved - is this import session approved, default: false
 *
 * @property {Models.ImportSessions} user - user started this import session
 * @property {Date} createdAt - when this import session was started
 */
var ImportSessions = new Schema({
  // todo: rename
  ds: {type: Schema.Types.ObjectId, ref: 'DataSources', required: true},
  // todo: add
  dataSources: [{type: Schema.Types.ObjectId, ref: 'DataSources'}],
  catalogVersion: {type: Schema.Types.ObjectId, ref: 'PublisherCatalogVersions'},

  isApproved: {type: Boolean, 'default': false},
  // todo: rename
  user: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  version: {type: Date, 'default': new Date()},
  // todo: to
  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date()}
});

mongoose.model('ImportSessions', ImportSessions);
