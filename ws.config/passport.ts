import * as passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import * as PassportUniqueTokenStrategy from 'passport-unique-token';

import { usersRepository } from '../ws.repository/ddf/users/users.repository';

const UniqueTokenStrategy = PassportUniqueTokenStrategy.Strategy;

passport.serializeUser((user: any, done: Function) => {
  return done(null, user._id);
});

passport.deserializeUser((id: any, done: Function) => {
  return usersRepository.findById(id, done);
});

enableLocalStrategy();
enableUniqueTokenStrategy();

function enableUniqueTokenStrategy(): void {
  const tokenName = 'waffle-server-token';
  const strategyOptions = {
    tokenQuery: tokenName,
    tokenParams: tokenName,
    tokenField: tokenName,
    tokenHeader: tokenName
  };

  passport.use(new UniqueTokenStrategy(strategyOptions, (token: string, done: Function) => {
    usersRepository.findUserByUniqueTokenAndProlongSession(token, (error: string, user: any) => {
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

function enableLocalStrategy(): void {
  passport.use(new LocalStrategy((username: string, password: string, done: Function) => {
      return usersRepository.findUserByEmail(username, (error: string, user: any) => {
        if (error) {
          return done(error);
        }

        if (!user) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        if (!user.validPassword(password)) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }

        return done(null, user);
      });
    }
  ));
}
