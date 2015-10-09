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
  publisher: {type: Schema.Types.ObjectId, ref: 'Publishers', required: true},
  name: {type: String, unique: true, required: true},
  url: String,
  createdAt: {type: Date, 'default': Date.now()},
  createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'}
});

mongoose.model('PublisherCatalogs', PublisherCatalogs);
