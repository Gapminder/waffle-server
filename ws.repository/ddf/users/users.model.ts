import { model, Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';

const SALT_WORK_FACTOR = 10;

const Users: any = new Schema({
  name: {type: String},
  email: {type: String, index: true, unique: true, required: true},
  username: {type: String, index: true, unique: true, required: true},
  password: {type: String, required: true, 'private': true},
  image: String,
  uniqueToken: {type: String},
  expireToken: {type: Number}
});

Users.pre('save', function(next: any): void {
  // tslint:disable-next-line
  const user = this;

  if (!user.isModified('password')) { return next(); }

  return bcrypt.genSalt(SALT_WORK_FACTOR, (saltError: any, salt: any) => {
    if (saltError) {
      return next(saltError);
    }

    return bcrypt.hash(user.password, salt, (hashingError: any, hash: any) => {
      if (hashingError) {
        return next(hashingError);
      }

      user.password = hash;
      next();
    });
  });
});

Users.methods.comparePassword = function(candidatePassword: string, onCompared: Function): void {
  // tslint:disable-next-line
  const user = this;

  bcrypt.compare(candidatePassword, user.password, function(comparisonError: string, isMatch: boolean): void {
    if (comparisonError) {
      return onCompared(comparisonError);
    }

    return onCompared(null, isMatch);
  });
};

Users.index({uniqueToken: 1, expireToken: 1});

export default model('Users', Users);
