import * as _ from 'lodash';
import { UsersRepository } from './ws.repository/ddf/users/users.repository';
import { config } from './ws.config/config';
import { logger } from './ws.config/log';
import { constants } from './ws.utils/constants';

function makeDefaultUser(): void {
  if (_.isEmpty(config.DEFAULT_USER_PASSWORD)) {
    logger.error('DEFAULT_USER_PASSWORD was not provided');
    throw new Error('DEFAULT_USER_PASSWORD was not provided');
  }

  const user = {
    name: 'John Doe',
    email: constants.DEFAULT_USER_EMAIL,
    username: 'dev',
    password: config.DEFAULT_USER_PASSWORD
  };

  // TODO: apply async lib
  UsersRepository.findUserByEmail(user.email, (findError: string, existingUser: any) => {
    if (findError) {
      logger.error('Error occurred fetching existing user');
      throw new Error('Error occurred fetching existing user');
    }

    if (!existingUser) {
      return UsersRepository.createUser(user, (createError: string) => {
        if (createError) {
          logger.error('Default user was not created');
          throw new Error('Default user was not created');
        }

        return logger.info('Default user was created');
      });
    }

    return logger.info('Default user already exists - no need to create new one');
  });
}

export {
  makeDefaultUser
};
