'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef DimensionSchema
 * @memberof Models
 * @class
 *
 * @param {String} entityName - established entity name
 * @param {String} value - of entity

 * @param {String} entityGroup - of entity which was specified in ddf's file name
 */
let DimensionSchema = new Schema({
  gid: String,
  conceptGid: String,

  concept: {type: Schema.Types.ObjectId, ref: 'Concepts'},
  entity: {type: Schema.Types.ObjectId, ref: 'Entities'}
}, {_id: false});

/**
 * @typedef {Object} DataPoints
 * @memberof Models
 *
 * @property {String} dimensions - contains objects that are define point for the data
 * @property {String} value - data this DataPoint contains at the given coordinates
 * @property {String} measure - points to measure this DataPoint has value for
 * @property {String} measureName - name of the measure this DataPoint has value for
 *
 * @property {Array<Models.DatasetVersions>} versions - all versions of data set in which the entity was added
 * @property {Object} previous - a link to previous version of the current entity
 */
let DataPoints = new Schema({
  dimensions: [DimensionSchema],
  value: String,

  measure: {type: Schema.Types.ObjectId, ref: 'Concepts'},
  measureGid: String,

  versions: [{type: Schema.Types.ObjectId, ref: 'DatasetVersions'}],
  previous: {type: Schema.Types.ObjectId, ref: 'DataPoints', sparse: true}
});

DataPoints.index({value: 1, 'coordinates.conceptName': 1, 'coordinates.gid': 1});
DataPoints.index({measure: 1, value: 1});
DataPoints.index({measure: 1, 'coordinates.concept': 1, 'coordinates.gid': 1});
DataPoints.index({measureName: 1, 'coordinates.conceptName': 1, 'coordinates.gid': 1});

module.exports = mongoose.model('DataPoints', DataPoints);
