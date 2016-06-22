const crypto = require('crypto');

const UsersRepository = require('../ws.repository/ddf/users/users.repository.js');

const ONE_HOUR = 60 * 60 * 1000;
const VALID_TOKEN_PERIOD_IN_MILLIS = ONE_HOUR;

module.exports = {
  authenticate
};

function authenticate(credentials, onAuthenticated) {
  const email = credentials.email;
  const password = credentials.password;

  UsersRepository.findUserByEmail(email, (error, user) => {
    if (error) {
      return onAuthenticated(error);
    }

    if (!user) {
      return onAuthenticated(`User with an email: '${email}' was not found`);
    }

    if (user.password !== password) {
      return onAuthenticated('Provided password didn\'t match');
    }

    const tokenDescriptor = generateTokenDescriptor();
    UsersRepository.setUpToken(email, tokenDescriptor.uniqueToken, tokenDescriptor.expireToken, (error, user) => {
      if (error) {
        return onAuthenticated(error);
      }

      return onAuthenticated(null, user.uniqueToken);
    });
  });
}

function generateTokenDescriptor() {
  return {
    uniqueToken: crypto.randomBytes(32).toString('base64'),
    expireToken: Date.now() + VALID_TOKEN_PERIOD_IN_MILLIS
  };
}
