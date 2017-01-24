import * as passport from 'passport';
import  { Strategy as LocalStrategy } from 'passport-local';
import  * as PassportUniqueTokenStrategy from 'passport-unique-token';

import {UsersRepository} from '../ws.repository/ddf/users/users.repository';

const UniqueTokenStrategy = PassportUniqueTokenStrategy.Strategy;

passport.serializeUser((user: any, done: Function) => {
  return done(null, user._id);
});

passport.deserializeUser((id, done) => {
  return UsersRepository.findById(id, (error, user) => {
    done(error, user);
  });
});

enableLocalStrategy();
enableUniqueTokenStrategy();

function enableUniqueTokenStrategy() {
  const tokenName = 'waffle-server-token';
  const strategyOptions = {
    tokenQuery: tokenName,
    tokenParams: tokenName,
    tokenField: tokenName,
    tokenHeader: tokenName
  };

  passport.use(new UniqueTokenStrategy(strategyOptions, (token, done) => {
    UsersRepository.findUserByUniqueTokenAndProlongSession(token, (error, user) => {
      if (error) {
        return done(error);
      }

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    });
  }));
}

function enableLocalStrategy() {
  passport.use(new LocalStrategy((username, password, done) => {
      return UsersRepository.findUserByEmail(username, (error, user) => {
        if (error) {
          return done(error);
        }

        if (!user) {
          return done(null, false, {message: 'Incorrect username or password.'});
        }

        if (!user.validPassword(password)) {
          return done(null, false, {message: 'Incorrect username or password.'});
        }

        return done(null, user);
      });
    }
  ));
}
