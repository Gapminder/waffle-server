'use strict';

let mongoose = require('mongoose');
let Users = mongoose.model('Users');

const constants = require('../../../ws.utils/constants');

function UsersRepository() {
}

UsersRepository.prototype.findById = function (id, onFound) {
  return Users.findOne({_id: id}).lean().exec(onFound);
};

UsersRepository.prototype.findUserByEmail = (email, onFound) => {
  return Users.findOne({email}).exec(onFound);
};

UsersRepository.prototype.findUserByUniqueTokenAndProlongSession = function (uniqueToken, onFound) {
  const notExpiredUserQuery = {
    uniqueToken,
    expireToken: {$gt: Date.now()}
  };

  const updateExpireTokenQuery = {
    $set: {
      inc: {
        expireToken: constants.VALID_TOKEN_PERIOD_IN_MILLIS
      }
    }
  };

  return Users.findOneAndUpdate(notExpiredUserQuery, updateExpireTokenQuery, {new: true}).lean().exec(onFound);
};

UsersRepository.prototype.setUpToken = function (email, uniqueToken, expireToken, onFound) {
  return Users.findOneAndUpdate({email}, {uniqueToken, expireToken}, {new: true}).lean().exec(onFound);
};

UsersRepository.prototype.createUser = function (user, done) {
  Users.findOne({email: user.email}).lean().exec((error, existingUser) => {
    if (error) {
      return done(`Error occurred during user creation`);
    }

    if (existingUser) {
      return done(`User with an email: "${user.email}" already exists`);
    }

    return Users.create(user, done);
  });
};

module.exports = new UsersRepository();
