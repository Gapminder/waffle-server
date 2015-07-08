'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} ImportSessions
 *
 * @property {DataSourceTypes} dsid - Import Session of this DataSource
 * @property {Boolean} isApproved - is this import session approved, default: false
 *
 * @property {ImportSessions} user - user started this import session
 * @property {Date} createdAt - when this import session was started
 */
var ImportSessions = new Schema({
  ds: {type: Schema.Types.ObjectId, refs: 'DataSources', required: true},
  isApproved: {type: Boolean, 'default': false},

  user: {type: Schema.Types.ObjectId, refs: 'Users', required: true},
  createAt: {type: Date, 'default': new Date(), required: true}
});

mongoose.model('ImportSessions', ImportSessions);
