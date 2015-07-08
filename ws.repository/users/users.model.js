'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Users
 * @memberof Models
 *
 * @property {String} name - users full name
 * @property {String} password - @private, users password
 * @property {String} salt - @private, users salt
 */
var Users = new Schema({
  name: String,
  email: {type: String, index: true, unique: true, required: true},
  password: {type: String, required: true, 'private': true},
  salt: {type: String, required: true, 'private': true}
});

mongoose.model('Users', Users);
