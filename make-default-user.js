const _ = require('lodash');
const usersRepository = require('./ws.repository/ddf/users/users.repository');
const config = require('./ws.config/config');
const logger = require('./ws.config/log');
const constants = require('./ws.utils/constants');

module.exports = () => {
  if (_.isEmpty(config.DEFAULT_USER_PASSWORD)) {
    throw new Error('DEFAULT_USER_PASSWORD was not provided');
  }

  const user = {
    name: 'John Doe',
    email: constants.DEFAULT_USER_EMAIL,
    username: 'dev',
    password: config.DEFAULT_USER_PASSWORD
  };

  usersRepository.findUserByEmail(user.email, (error, existingUser) => {
    if (error) {
      throw new Error('Error occurred fetching existing user');
    }

    if (!existingUser) {
      return usersRepository.createUser(user, error => {
        if (error) {
          return logger.error('Default user was not created');
        }

        return logger.info('Default user was created');
      });
    }

    return logger.info('Default user already exists - no need to create new one');
  });
};
