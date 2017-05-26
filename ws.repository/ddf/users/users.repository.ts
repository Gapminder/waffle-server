import {model} from 'mongoose';
import {constants} from '../../../ws.utils/constants';

const Users = model('Users');

/* tslint:disable-next-line:no-empty */
function UsersRepository(): void {
}

UsersRepository.prototype.findById = function (id: any, onFound: Function): any {
  return Users.findOne({_id: id}).lean().exec(onFound);
};

UsersRepository.prototype.findUserByEmail = (email: any, onFound: Function) => {
  return Users.findOne({email}).exec(onFound);
};

UsersRepository.prototype.findUserByUniqueTokenAndProlongSession = function (uniqueToken: any, onFound: Function): Promise<object> {
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

  return Users.findOneAndUpdate(notExpiredUserQuery, updateExpireTokenQuery, {new: true}).lean().exec(onFound);
};

UsersRepository.prototype.setUpToken = function (email: string, uniqueToken: string, expireToken: string, onFound: Function): any {
  return Users.findOne({email}).exec((error: string, user: any) => {
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

    return user.save((err: any) => {
      if (err) {
        return onFound(err);
      }
      return onFound(null, user);
    });
  });
};

UsersRepository.prototype.createUser = function (user: any, done: Function): Promise<Object> {
  return Users.findOne({email: user.email}).lean().exec((error: string, existingUser: any) => {
    if (error) {
      return done(`Error occurred during user creation`);
    }

    if (existingUser) {
      return done(`User with an email: "${user.email}" already exists`);
    }

    return Users.create(user, done);
  });
};

function calculateNewTokenExpirationDate(now: any): void {
  return now + constants.VALID_TOKEN_PERIOD_IN_MILLIS;
}

const repository = new UsersRepository();
export {repository as UsersRepository};
