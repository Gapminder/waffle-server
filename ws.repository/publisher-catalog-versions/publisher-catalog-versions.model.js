'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Publisher Catalog Version
 * @memberof Models
 *
 * @property {String} version - label of Publisher Catalog Version
 *
 */
var PublisherCatalogVersions = new Schema({
  publisher: {type: Schema.Types.ObjectId, ref: 'Publishers'},
  catalog: {type: Schema.Types.ObjectId, ref: 'PublisherCatalogs'},
  version: {type: String, required: true}
});

mongoose.model('PublisherCatalogVersions', PublisherCatalogVersions);
