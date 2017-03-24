import * as crypto from 'crypto';
import {constants} from '../ws.utils/constants';
import {UsersRepository} from '../ws.repository/ddf/users/users.repository';

export {
  authenticate
};

function authenticate(credentials: Credentials, onAuthenticated: Function): void {
  const email = credentials.email;
  const password = credentials.password;

  return UsersRepository.findUserByEmail(email, (error: any, user: any) => {
    if (error) {
      return onAuthenticated('Error was happened during credentials verification');
    }

    if (!user) {
      return onAuthenticated(`User with an email: '${email}' was not found`);
    }

    return user.comparePassword(password, (comparisonError: any, isMatch: boolean) => {
      if (comparisonError) {
        return onAuthenticated('Error was happened during credentials verification');
      }

      if (!isMatch) {
        return onAuthenticated('Provided password didn\'t match');
      }

      const tokenDescriptor = generateTokenDescriptor();
      return UsersRepository.setUpToken(email, tokenDescriptor.uniqueToken, tokenDescriptor.expireToken, (setUpTokenError: any, userWithToken: any) => {
        if (setUpTokenError) {
          return onAuthenticated(`Couldn't set up Waffle Server token`);
        }

        return onAuthenticated(null, userWithToken.uniqueToken);
      });
    });
  });
}

function generateTokenDescriptor(): TokenDescriptor {
  return {
    uniqueToken: crypto.randomBytes(32).toString('base64'),
    expireToken: Date.now() + constants.VALID_TOKEN_PERIOD_IN_MILLIS
  };
}

interface TokenDescriptor {
  uniqueToken: string;
  expireToken: number;
}

interface Credentials {
  email: string;
  password: string;
}
