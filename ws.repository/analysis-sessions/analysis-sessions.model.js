'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} AnalysisSessions
 * @memberof Models
 *
 * @property {Boolean} isApproved - is this session approved
 *
 * @property {Models.Users} user - who started this analysis session
 * @property {Date} createdAt - when this analysis session was started
 */
var AnalysisSessions = new Schema({
  isApproved: {type: Boolean, 'default': false},

  user: {type: Schema.Types.ObjectId, refs: 'Users', required: true},
  createdAt: {type: Date, 'default': new Date()}
});

mongoose.model('AnalysisSessions', AnalysisSessions);
