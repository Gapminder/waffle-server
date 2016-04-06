'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef CoordinateSchema
 * @memberof Models
 * @class
 *
 * @param {String} entityName - established entity name
 * @param {String} value - of entity
 */
let CoordinateSchema = new Schema({
  value: String,
  entityName: String,

  entityGroup: {type: Schema.Types.ObjectId, ref: 'EntityGroups'},
  entity: {type: Schema.Types.ObjectId, ref: 'Entities'}
}, {_id: false});

/**
 * @typedef {Object} DataPoints
 * @memberof Models
 *
 * @param {String} coordinates - contains objects that are define point for the data
 * @param {String} value - data this DataPoint contains at the given coordinates
 * @param {String} measure - points to measure this DataPoint has value for
 * @param {String} measureName - name of the measure this DataPoint has value for
 * @param {Object} previous - a link to previous version of the current entity
 */
let DataPoints = new Schema({
  coordinates: [CoordinateSchema],
  value: String,

  measure: {type: Schema.Types.ObjectId, ref: 'Measures'},
  measureName: String,

  previous: {type: Schema.Types.ObjectId, ref: 'DataPoints', sparse: true}
});

DataPoints.index({value: 1, 'coordinates.entityName': 1, 'coordinates.value': 1});
DataPoints.index({measure: 1, value: 1});
DataPoints.index({measure: 1, 'coordinates.entityGroup': 1, 'coordinates.value': 1});
DataPoints.index({measureName: 1, 'coordinates.entityName': 1, 'coordinates.value': 1});

module.exports = mongoose.model('DataPoints', DataPoints);
