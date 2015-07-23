'use strict';
var passport = require('../ws.config/passport');

module.exports = function (app) {
  app.post('/login', passport.authenticate('local', {
      successRedirect: '/', failureRedirect: '/login', failureFlash: true
    }));

  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });
};
