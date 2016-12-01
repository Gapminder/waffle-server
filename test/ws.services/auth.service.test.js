'use strict';

const chai = require('chai');
const expect = chai.expect;
require('../../ws.repository');
const proxyquire = require('proxyquire');


describe('auth service testing', () => {

  it('should return an error: Error was happened during credentials verification', (done) => {
    const auth = proxyquire('../../ws.services/auth.service', {
      '../ws.repository/ddf/users/users.repository.js': {
        findUserByEmail: (email, done) => {
          done('Boom!');
        }
      }
    });

    auth.authenticate({email: 'bla', password: 'bla'}, (error) => {
      expect(error).to.equal('Error was happened during credentials verification');
      done();
    })
  });

  it('should return an error: User with an email: \'user@mail.com\' was not found', (done) => {
    const auth = proxyquire('../../ws.services/auth.service', {
      '../ws.repository/ddf/users/users.repository.js': {
        findUserByEmail: (email, done) => {
          done();
        }
      }
    });

    auth.authenticate({email: 'user@mail.com', password: 'bla'}, (error) => {
      expect(error).to.contain('User with an email: \'user@mail.com\' was not found');
      done();
    })
  });

  it('should return an error: Provided password didn\'t match', (done) => {

    const validUser = {
      comparePassword: (pass, onCompared) => {
        return onCompared(null, false);
      }
    };
    const auth = proxyquire('../../ws.services/auth.service', {
      '../ws.repository/ddf/users/users.repository.js': {
        findUserByEmail: (email, done) => {
          done(null, validUser);
        }
      }
    });

    auth.authenticate({email: 'user@mail.com', password: 'bla'}, (error) => {
      expect(error).to.contain('Provided password didn\'t match');
      done();
    })
  });

  it('should return an error: Error was happened during credentials verification', (done) => {

    const validUser = {
      comparePassword: (pass, onCompared) => {
        return onCompared(true, false);
      }
    };
    const auth = proxyquire('../../ws.services/auth.service', {
      '../ws.repository/ddf/users/users.repository.js': {
        findUserByEmail: (email, done) => {
          done(null, validUser);
        }
      }
    });

    auth.authenticate({email: 'user@mail.com', password: 'bla'}, (error) => {
      expect(error).to.contain('Error was happened during credentials verification');
      done();
    })
  });

  it.only('should return token', (done) => {

    const validUser = {
      comparePassword: (pass, onCompared) => {
        return onCompared(null, true);
      }
    };
    const invalidUser = {
      uniqueToken: 'token'
    };

    const auth = proxyquire('../../ws.services/auth.service', {
      '../ws.repository/ddf/users/users.repository.js': {
        findUserByEmail: (email, done) => {
          done(null, validUser);
        },
        setUpToken: (email, uniqueToken, expireToken, done) => {
          done(null, invalidUser);
        }
      }
    });

    auth.authenticate({email: 'user@mail.com', password: 'bla'}, (error, uniqueToken) => {
      expect(uniqueToken).to.contain('token');
      expect(error).to.be.null;
      done();
    });
  });

  it('should return an error: Couldn\'t set up Waffle Server token', (done) => {

    const validUser = {
      comparePassword: (pass, onCompared) => {
        return onCompared(null, true);
      }
    };
    const invalidUser = {
      uniqueToken: 'token'
    };
    const auth = proxyquire('../../ws.services/auth.service', {
      '../ws.repository/ddf/users/users.repository.js': {
        findUserByEmail: (email, done) => {
          done(null, validUser);
        },
        setUpToken: (email, uniqueToken, expireToken, done) => {
          done(true, invalidUser);
        }
      }
    });

    auth.authenticate({email: 'user@mail.com', password: 'bla'}, (error) => {
      expect(error).to.contain('Couldn\'t set up Waffle Server token');
      done();
    });
  });
})
