'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} DataSourceTypes
 * @memberof Models
 *
 * @property {String} name - unqi
 * @property {String} dsuid - unique data source `id` within DataSource space
 */
var DataSourceTypes = new Schema({
  name: {type: String, index: true, unique: true, required: true},
  title: {type: String, required: true},
  dimensions: {}
});

mongoose.model('DataSourceTypes', DataSourceTypes);
