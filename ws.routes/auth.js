var bcrypt = require('bcrypt');
var passport = require('passport');
var mongoose = require('mongoose');

var loginPage = '/login';
var ensureAuthenticated = require('./utils').ensureAuthenticated;
module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var config = app.get('config');
  var Users = mongoose.model('Users');

  // google stategy
  app.get('/api/auth/google', passport.authenticate('google', {scope: config.social.GOOGLE_SCOPE}));
  app.get('/api/auth/google/callback', passport.authenticate('google', {
    failureRedirect: loginPage,
    successRedirect: '/'
  }));

  // local strategy
  app.post('/api/auth/register', function (req, res, next) {
    Users.findOne({
      $or: [
        {username: req.body.username},
        {email: req.body.email}
      ]
    }, onUserLookUp);
    function onUserLookUp(err, existUser) {
      if (err) {
        return res.json({success: false, error: err});
      }

      if (existUser) {
        console.log('[' + (new Date()).toTimeString() + '] registration is failed - ' +
          'user already exist, username: ' + req.body.username);
        var info = 'User already exist';

        if (existUser.username === req.body.username) {
          info += ', with username: ' + existUser.username;
        }

        if (existUser.email === req.body.email) {
          info += ', with email: ' + existUser.email;
        }
        return res.json({success: false, data: {info: info}, error: true});
      }

      bcrypt.genSalt(10, function (err1, salt) {
        if (err1) {
          return res.json({success: false, error: err});
        }
        bcrypt.hash(req.body.password, salt, function (err2, hash) {
          if (err2) {
            return res.json({success: false, error: err});
          }
          Users.create({
            username: req.body.username,
            password: hash,
            email: req.body.email
          }, onUserCreate);
        });
      });
    }

    function onUserCreate(err1) {
      if (err1) {
        return res.json({success: false, error: err1});
      }
      console.log('[' + (new Date()).toTimeString() + '] registration is successful, username: ' + req.body.username);

      passport.authenticate('local', function (err, user) {
        if (err) {
          return res.json({success: false, error: err});
        }

        return req.login(user, function () {
          console.log(user.email + ' logged in');
          return res.json({
            success: !err,
            data: {username: user.username},
            error: err
          });
        });
      })(req, res, next);
    }
  });

  app.post('/api/auth/login', function (req, res) {
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        return res.json({success: !err, error: err, data: info});
      }

      if (!user) {
        req.session.messages = [info.message];
        return res.json({
          success: false, error: 'Access denied for ' + req.body.email + ': ' + info.msg
        });
      }

      req.logIn(user, function (err2) {
        if (err2) {
          logger.error(err2);
        }

        return res.json({success: !err2, error: err2, data: user});
      });
    })(req, res);
  });

  app.get('/api/auth/logout', ensureAuthenticated, function (req, res) {
    req.logout();
    if (req.xhr) {
      return res.json({success: true});
    }
    return res.redirect(loginPage);
  });
};
