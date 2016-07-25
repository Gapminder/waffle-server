'use strict';

const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const UniqueTokenStrategy = require('passport-unique-token').Strategy;

const usersRepository = require('../ws.repository/ddf/users/users.repository');

module.exports = (function () {

  passport.serializeUser((user, done) => {
    return done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    return usersRepository.findById(id, (error, user) => {
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
      usersRepository.findUserByUniqueTokenAndProlongSession(token, (error, user) => {
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
        const Users = mongoose.model('Users');
        return Users.findOne({
          $or: [
            {username: new RegExp('^' + username + '$', 'i')},
            {email: username}
          ]
        }, (error, user) => {
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
}());
