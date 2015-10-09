var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

module.exports = function (app) {
  var config = app.get('config');

  function findUserById(id, cb) {
    var Users = mongoose.model('Users');
    Users.findOne({_id: id}).exec(function (err, user) {
      cb(err, user);
    });
  }

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    findUserById(id, function (err, user) {
      done(err, user);
    });
  });

  enableLocalStrategy();
  enableGoogleStrategy();

  // local strategy
  function enableLocalStrategy() {
    passport.use(new LocalStrategy(
      function (username, password, done) {
        var Users = mongoose.model('Users');
        Users.findOne({
          $or: [
            {username: new RegExp('^' + username + '$', 'i')},
            {email: username}
          ]
        }, function (err, user) {
          if (err) {
            return done(err);
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

  // google strategy
  function enableGoogleStrategy() {
    /* jshint -W106 */
    passport.use(new GoogleStrategy({
      clientID: config.social.GOOGLE_CLIENT_ID,
      clientSecret: config.social.GOOGLE_CLIENT_SECRET,
      callbackURL: config.social.GOOGLE_CALLBACK_URL
    }, function (accessToken, refreshToken, profile, done) {
      var Users = mongoose.model('Users');
      Users.findOne({
        $or: [
          {'social.googleId': profile._json.id},
          {email: profile._json.email}
        ]
      }, function (err, user) {
        // user not found -> create new
        if (user || err) {
          return done(err, user);
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
        }, function (err2) {
          return done(err2, user, {isNewUser: true});
        });
      });
    }));
  }
};
