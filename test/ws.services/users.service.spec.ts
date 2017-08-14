import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';

import { UsersService } from '../../ws.services/users.service';
import { config } from '../../ws.config/config';
import { constants } from '../../ws.utils/constants';

const sandbox = sinonTest.configureTest(sinon);

describe('UsersService', () => {
  it('fails when default password is not provided', sandbox(function (): any {
    const service = new UsersService({} as any);
    return service.makeDefaultUser().catch((error: string) => {
      expect(error).to.equal('DEFAULT_USER_PASSWORD was not provided');
    });
  }));

  it('reuses existing user', sandbox(function (): any {
    this.stub(config, 'DEFAULT_USER_PASSWORD').get(() => '123');

    const existingUser = {
      name: 'Billy G.'
    };

    const repository: any = {
      findUserByEmail: this.stub().resolves(existingUser)
    };

    const service = new UsersService(repository);
    return service.makeDefaultUser().then((user: any) => {
      expect(user).to.deep.equal(existingUser);
    });
  }));

  it('creates new user if there is none', sandbox(function (): any {
    this.stub(config, 'DEFAULT_USER_PASSWORD').get(() => '123');

    const createdUser = {
      name: 'Billy G.'
    };

    const repository: any = {
      findUserByEmail: this.stub().resolves(),
      createUser: this.stub().resolves(createdUser)
    };

    const service = new UsersService(repository);
    return service.makeDefaultUser().then((user: any) => {
      sinon.assert.calledWith(repository.findUserByEmail, constants.DEFAULT_USER_EMAIL);
      expect(user).to.deep.equal(createdUser);
    });
  }));

  it('propagates all failures to the top handlers', sandbox(function (): any {
    this.stub(config, 'DEFAULT_USER_PASSWORD').get(() => '123');

    const repository: any = {
      findUserByEmail: this.stub().rejects('Gotcha!')
    };

    const service = new UsersService(repository);
    return service.makeDefaultUser().catch((error: any) => {
      expect(error.name).to.equal('Gotcha!');
    });
  }));
});
