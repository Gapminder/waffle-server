'use strict';
var passport = require('../ws.config/passport');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();

  app.post('/login', passport.authenticate('local', {
      successRedirect: '/', failureRedirect: '/login', failureFlash: true
    }));

  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });
};
