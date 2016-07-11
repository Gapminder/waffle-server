const _ = require('lodash');
const UsersRepository = require('./ws.repository/ddf/users/users.repository');

module.exports = (app) => {
  const config = app.get('config');
  const logger = app.get('log');

  if (_.isEmpty(config.DEFAULT_USER_PASSWORD)) {
    throw new Error('DEFAULT_USER_PASSWORD was not provided');
  }

  const user = {
    name: 'John Doe',
    email: 'dev@gapminder.org',
    username: 'dev',
    password: config.DEFAULT_USER_PASSWORD
  };

  UsersRepository.removeUserByEmail(user.email, error => {
    if (error) {
      throw new Error('Default user was not vanished');
    }

    return UsersRepository.createUser(user, error => {
      if (error) {
        return logger.error('Default user was not created');
      }

      return logger.info('Default user was created');
    });
  });
};
