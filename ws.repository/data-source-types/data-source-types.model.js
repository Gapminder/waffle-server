'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} DataSourceTypes - used only to mark fetched data model
 * used to select corresponding reader, renderer
 * @memberof Models
 *
 * @property {String} name - unqi
 * @property {String} dsuid - unique data source `id` within DataSource space
 */
var DataSourceTypes = new Schema({
  name: {type: String, index: true, unique: true, required: true},
  title: {type: String, required: true}
});

mongoose.model('DataSourceTypes', DataSourceTypes);
