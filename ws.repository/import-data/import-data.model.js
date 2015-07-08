'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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
  ds: [{
    d: String,
    v: String
  }],
  v: String,

  importSessions: {
    type: [{type: Schema.Types.ObjectId, refs: 'ImportSessions'}],
    'private': true
  }
});

mongoose.model('ImportData', ImportData);
