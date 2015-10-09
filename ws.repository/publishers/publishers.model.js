'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Publishers
 * @memberof Models
 *
 * @property {String} name - name of Publisher
 * @property {String} url - URL of Publisher
 *
 */
var Publishers = new Schema({
  name: {type: String, unique: true, required: true},
  url: {type: String},
  createdAt: {type: Date, 'default': Date.now()},
  createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'}
});

mongoose.model('Publishers', Publishers);
