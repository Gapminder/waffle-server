import * as crypto from 'crypto';

import * as constants from '../ws.utils/constants';
import * as usersRepository from '../ws.repository/ddf/users/users.repository';

export {
  authenticate
};

function authenticate(credentials, onAuthenticated) {
  const email = credentials.email;
  const password = credentials.password;

  return usersRepository.findUserByEmail(email, (error, user) => {
    if (error) {
      return onAuthenticated('Error was happened during credentials verification');
    }

    if (!user) {
      return onAuthenticated(`User with an email: '${email}' was not found`);
    }

    return user.comparePassword(password, (comparisonError, isMatch) => {
      if (comparisonError) {
        return onAuthenticated('Error was happened during credentials verification');
      }

      if (!isMatch) {
        return onAuthenticated('Provided password didn\'t match');
      }

      const tokenDescriptor = generateTokenDescriptor();
      return usersRepository.setUpToken(email, tokenDescriptor.uniqueToken, tokenDescriptor.expireToken, (error, user) => {
        if (error) {
          return onAuthenticated(`Couldn't set up Waffle Server token`);
        }

        return onAuthenticated(null, user.uniqueToken);
      });
    });
  });
}

function generateTokenDescriptor() {
  return {
    uniqueToken: crypto.randomBytes(32).toString('base64'),
    expireToken: Date.now() + constants.VALID_TOKEN_PERIOD_IN_MILLIS
  };
}
