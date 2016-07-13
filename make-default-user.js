const _ = require('lodash');
const usersRepository = require('./ws.repository/ddf/users/users.repository');
const config = require('./ws.config/config');
const logger = require('./ws.config/log');

module.exports = () => {
  if (_.isEmpty(config.DEFAULT_USER_PASSWORD)) {
    throw new Error('DEFAULT_USER_PASSWORD was not provided');
  }

  const user = {
    name: 'John Doe',
    email: 'dev@gapminder.org',
    username: 'dev',
    password: config.DEFAULT_USER_PASSWORD
  };

  usersRepository.removeUserByEmail(user.email, error => {
    if (error) {
      throw new Error('Default user was not vanished');
    }

    return usersRepository.createUser(user, error => {
      if (error) {
        return logger.error('Default user was not created');
      }

      return logger.info('Default user was created');
    });
  });
};
