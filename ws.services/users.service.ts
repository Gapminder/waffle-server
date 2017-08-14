import * as _ from 'lodash';
import { config } from '../ws.config/config';
import { constants } from '../ws.utils/constants';
import { UsersRepository } from '../ws.repository/ddf/users/users.repository';

const defaultUser = {
  name: 'John Doe',
  email: constants.DEFAULT_USER_EMAIL,
  username: 'dev',
  password: config.DEFAULT_USER_PASSWORD
};

export class UsersService {
  private usersRepository: UsersRepository;

  public constructor(usersRepository: UsersRepository) {
    this.usersRepository = usersRepository;
  }

  public makeDefaultUser(): Promise<any> {
    if (_.isEmpty(config.DEFAULT_USER_PASSWORD)) {
      return Promise.reject('DEFAULT_USER_PASSWORD was not provided');
    }

    return this.usersRepository.findUserByEmail(defaultUser.email)
      .then((existingUser: any) => existingUser ? existingUser : this.usersRepository.createUser(defaultUser));
  }
}
