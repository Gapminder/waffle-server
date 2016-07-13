'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bcrypt = require('bcryptjs');
const SALT_WORK_FACTOR = 10;

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

  uniqueToken: {type: String},
  expireToken: {type: Number}

  /*,
  salt: {type: String, required: true, 'private': true}*/
});

Users.pre('save', function(next) {
  const user = this;

  if (!user.isModified('password')) return next();

  return bcrypt.genSalt(SALT_WORK_FACTOR, (saltError, salt) => {
    if (saltError) {
      return next(saltError);
    }

    return bcrypt.hash(user.password, salt, (hashingError, hash) => {
      if (hashingError) {
        return next(hashingError);
      }

      user.password = hash;
      next();
    });
  });
});

Users.methods.comparePassword = function(candidatePassword, onCompared) {
  bcrypt.compare(candidatePassword, this.password, function(comparisonError, isMatch) {
    if (comparisonError) {
      return onCompared(comparisonError);
    }

    return onCompared(null, isMatch);
  });
};

module.exports = mongoose.model('Users', Users);
