import {model} from 'mongoose';
import {constants} from '../../../ws.utils/constants';

const Users = model('Users');

function calculateNewTokenExpirationDate(now: any): void {
  return now + constants.VALID_TOKEN_PERIOD_IN_MILLIS;
}

class UsersRepository {

  public findById(id: any, onFound: Function): any {
    return Users.findOne({_id: id}).lean().exec(onFound);
  }

  public findUserByEmail(email: any, onFound: Function): any {
    return Users.findOne({email}).exec(onFound);
  }

  public findUserByUniqueTokenAndProlongSession(uniqueToken: any, onFound: Function): Promise<object> {
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
  }

  public setUpToken(email: string, uniqueToken: string, expireToken: number, onFound: Function): any {
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
  }

  public createUser(user: any, done: Function): Promise<any> {
    return Users.findOne({email: user.email}).lean().exec((error: string, existingUser: any) => {
      if (error) {
        return done(`Error occurred during user creation`);
      }

      if (existingUser) {
        return done(`User with an email: "${user.email}" already exists`);
      }

      return Users.create(user, done);
    });
  }
}

const repository = new UsersRepository();
export {repository as UsersRepository};
