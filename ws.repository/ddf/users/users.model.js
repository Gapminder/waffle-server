'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Users
 * @memberof Models
 *
 * @property {String} name - users full name
 * @property {String} password - @private, users password
 * @property {String} salt - @private, users salt
 */
let Users = new Schema({
  name: {type: String},
  email: {type: String, index: true, unique: true, required: true},
  username: {type: String, index: true, unique: true, required: true},
  password: {type: String, required: true, 'private': true},
  image: String,
  social: {
    googleId: String
  }

  /*,
  salt: {type: String, required: true, 'private': true}*/
});

module.exports = mongoose.model('Users', Users);
