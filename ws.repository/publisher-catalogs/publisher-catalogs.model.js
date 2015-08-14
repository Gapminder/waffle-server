'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Publisher Catalog
 * @memberof Models
 *
 * @property {String} name - name of Publisher Catalog
 *
 */
var PublisherCatalogs = new Schema({
  name: {type: String, unique: true, required: true}
});

mongoose.model('PublisherCatalogs', PublisherCatalogs);
