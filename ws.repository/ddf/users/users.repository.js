'use strict';

let mongoose = require('mongoose');

let Users = mongoose.model('Users');

function UsersRepository() {
}

UsersRepository.prototype.findUserByEmail = (email, onFound) => {
  return Users.findOne({email}).exec(onFound);
};

UsersRepository.prototype.findUserByUniqueToken = (uniqueToken, onFound) => {
  const query = {
    uniqueToken,
    expireToken: {$gt: Date.now()}
  };

  return Users.findOne(query).lean().exec(onFound);
};

UsersRepository.prototype.setUpToken = (email, uniqueToken, expireToken, onFound) => {
  return Users.findOneAndUpdate({email}, {uniqueToken, expireToken}, {new: 1}).lean().exec(onFound);
};

UsersRepository.prototype.createUser = (user, done) => {
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

UsersRepository.prototype.removeUserByEmail = function (email, onRemoved) {
  return Users.findOneAndRemove({email}, onRemoved);
};


module.exports = new UsersRepository();
