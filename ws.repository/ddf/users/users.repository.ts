import {model} from 'mongoose';
import {constants} from '../../../ws.utils/constants';

const Users = model('Users');

function UsersRepository() {
}

UsersRepository.prototype.findById = function (id, onFound) {
  return Users.findOne({_id: id}).lean().exec(onFound);
};

UsersRepository.prototype.findUserByEmail = (email, onFound) => {
  return Users.findOne({email}).exec(onFound);
};

UsersRepository.prototype.findUserByUniqueTokenAndProlongSession = function (uniqueToken, onFound) {
  const now = Date.now();

  const notExpiredUserQuery = {
    uniqueToken,
    expireToken: {$gt: now}
  };

  const updateExpireTokenQuery = {
    $set: {
      expireToken: calculateNewTokenExpirationDate(now)
    }
  };

  return Users.findOneAndUpdate(notExpiredUserQuery, updateExpireTokenQuery, {'new': true}).lean().exec(onFound);
};

UsersRepository.prototype.setUpToken = function (email, uniqueToken, expireToken, onFound) {
  return Users.findOne({email}).exec((error, user: any) => {
    if (error) {
      return onFound(error);
    }

    const now = Date.now();
    if (user.expireToken > now) {
      user.expireToken = calculateNewTokenExpirationDate(now);
    } else {
      user.expireToken = expireToken;
      user.uniqueToken = uniqueToken;
    }

    return user.save(error => {
      if (error) {
        return onFound(error);
      }
      return onFound(null, user);
    });
  });
};

UsersRepository.prototype.createUser = function (user, done) {
  return Users.findOne({email: user.email}).lean().exec((error, existingUser) => {
    if (error) {
      return done(`Error occurred during user creation`);
    }

    if (existingUser) {
      return done(`User with an email: "${user.email}" already exists`);
    }

    return Users.create(user, done);
  });
};

function calculateNewTokenExpirationDate(now) {
  return now + constants.VALID_TOKEN_PERIOD_IN_MILLIS;
}

const repository = new UsersRepository();
export {repository as UsersRepository}
