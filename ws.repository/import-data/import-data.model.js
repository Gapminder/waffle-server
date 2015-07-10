'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DimensionSchema = new Schema({
  d: String,
  v: String
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
  ds: [DimensionSchema],
  v: String,

  importSessions: {

    type: [{type: Schema.Types.ObjectId, refs: 'ImportSessions'}],
    'private': true
  }
});

ImportData.index({'ds.d': 1, 'ds.v': 1, v: 1});

mongoose.model('ImportData', ImportData);
