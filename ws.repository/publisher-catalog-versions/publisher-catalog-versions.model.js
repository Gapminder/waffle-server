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
  publisher: {type: Schema.Types.ObjectId, ref: 'Publishers', required: true},
  catalog: {type: Schema.Types.ObjectId, ref: 'PublisherCatalogs', required: true},
  version: {type: String, required: true},
  createdAt: {type: Date, 'default': Date.now()},
  createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'}
});

mongoose.model('PublisherCatalogVersions', PublisherCatalogVersions);
