'use strict';

let mongoose = require('mongoose');

let Users = mongoose.model('Users');

let utils = require('../../utils');

function UsersRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  UsersRepository.prototype[actionName] = utils.actionFactory(actionName)(Users, this);
});

UsersRepository.prototype.findUserByEmail = (email, onFound) => {
  return Users.findOne({email}).lean().exec(onFound);
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
  return Users.findOneAndUpdate({email: user.email}, user, {upsert: true, new: true}).lean().exec(done);
};


module.exports = new UsersRepository();
