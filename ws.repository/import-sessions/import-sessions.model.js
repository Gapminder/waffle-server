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
  ds: {type: Schema.Types.ObjectId, refs: 'DataSources', required: true},
  isApproved: {type: Boolean, 'default': false},

  user: {type: Schema.Types.ObjectId, refs: 'Users', required: true},
  version: {type: Date, 'default': new Date()}
});

mongoose.model('ImportSessions', ImportSessions);
