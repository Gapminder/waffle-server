'use strict';
var passport = require('passport');
var Cookies = require('cookies');
var mongoose = require('mongoose');

var User = mongoose.model('Users');

module.exports = function (app) {
  var logger = app.get('log');

  app.get('/auth/logged-user', function (req, res) {
    var cookies = new Cookies(req, res);

    if (!cookies.get('rememberUser')) {
      return res.json({success: true, error: null, data: req.user});
    }

    return User.findOne({_id: mongoose.Types.ObjectId(cookies.get('rememberUser'))}).lean().exec(function (err, user) {
        if (err) {
          logger.error(err);
          return res.json({success: false, error: err});
        }

        return req.logIn(user, function (err) {
          if (err) {
            logger.error(err);
          }

          return res.json({success: !err, error: err, data: user});
        });
      });
  });

  app.get('/auth/logged-admin-user', function (req, res) {
    if (!req.user || !req.user._id) {
      return res.json({success: true, error: null, data: null});
    }

    return User.findOne({_id: req.user._id, role: {$exists: true}}).lean().exec(function (err, user) {
        if (err) {
          logger.error(err);
          return res.json({success: false, error: err});
        }

        var out = user && user._id ? {
          _id: user._id, role: user.role
        } : null;

        return res.json({success: !err, error: err, data: out});
      });
  });

  app.post('/auth/login', function (req, res) {
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

      req.logIn(user, function (err) {
        if (err) {
          logger.error(err);
        }

        var cookieValue = req.body.remember ? user._id : '';

        if (req.body.remember) {
          var cookies = new Cookies(req, res);
          cookies.set('rememberUser', cookieValue, {
            overwrite: true, expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31)
          });
        }

        return res.json({success: !err, error: err, data: user});
      });
    })(req, res);
  });

  app.get('/auth/logout', ensureAuthenticated, function (req, res) {
    var cookies = new Cookies(req, res);
    cookies.set('rememberUser', '', {overwrite: true});

    return res.json({success: true, error: undefined, data: undefined});
  });

  //app.get('/google', passport.authenticate('google', { scope: 'email' }));
  //app.get('/google/callback', passport.authenticate('google', {
  //  failureRedirect: '/auth/login',
  //  successRedirect: '/'
  //}));
  //
  //app.get('/facebook', passport.authenticate('facebook'));
  //app.get('/facebook/callback', passport.authenticate('facebook', {
  //  failureRedirect: '/auth/login',
  //  successRedirect: '/'
  //}));
  //
  //app.get('/twitter', passport.authenticate('twitter'));
  //app.get('/twitter/callback', passport.authenticate('twitter', {
  //  failureRedirect: '/auth/login',
  //  successRedirect: '/'
  //}));
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}
