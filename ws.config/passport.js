'use strict';

const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const UniqueTokenStrategy = require('passport-unique-token').Strategy;

const UsersRepository = require('../ws.repository/ddf/users/users.repository');

module.exports = app => {
  const config = app.get('config');

  passport.serializeUser((user, done) => {
    return done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    return UsersRepository.findById(id, (error, user) => {
      done(error, user);
    });
  });

  enableLocalStrategy();
  enableGoogleStrategy();
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
      UsersRepository.findUserByUniqueToken(token, (error, user) => {
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

  function enableGoogleStrategy() {
    const googleConfig = {
      clientID: config.social.GOOGLE_CLIENT_ID,
      clientSecret: config.social.GOOGLE_CLIENT_SECRET,
      callbackURL: config.social.GOOGLE_CALLBACK_URL
    };
    /* jshint -W106 */
    passport.use(new GoogleStrategy(googleConfig, (accessToken, refreshToken, profile, done) => {
      const Users = mongoose.model('Users');

      Users.findOne({
        $or: [
          {'social.googleId': profile._json.id},
          {email: profile._json.email}
        ]
      }, (error, user) => {
        // user not found -> create new
        if (user || error) {
          return done(error, user);
        }

        Users.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          image: profile.photos[0].value,
          provider: profile.provider,
          social: {
            googleId: profile.id
          },
          password: accessToken,
          username: profile.displayName
        }, userCreationError => {
          return done(userCreationError, user, {isNewUser: true});
        });
      });
    }));
  }
};
