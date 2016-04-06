'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef EntitySchema
 * @memberof Models
 * @class
 *
 * @param {String} entityName - established entity name
 * @param {String} value - of entity
 */
let EntitySchema = new Schema({
  value: String,
  entityName: String,

  entityGroup: {type: Schema.Types.ObjectId, ref: 'EntityGroups'},
  entity: {type: Schema.Types.ObjectId, ref: 'Entities'}
}, {_id: false});

/**
 * @typedef {Object} DataPoints
 * @memberof Models
 */
let DataPoints = new Schema({
  coordinates: [EntitySchema],
  value: String,

  measure: {type: Schema.Types.ObjectId, ref: 'Measures'},
  measureName: String
});

DataPoints.index({value: 1, 'coordinates.entityName': 1, 'coordinates.value': 1});
DataPoints.index({measure: 1, value: 1});
DataPoints.index({measure: 1, 'coordinates.entityGroup': 1, 'coordinates.value': 1});
DataPoints.index({measureName: 1, 'coordinates.entityName': 1, 'coordinates.value': 1});

module.exports = mongoose.model('DataPoints', DataPoints);
