var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var passport = require('passport');
var logger = require('morgan');
var favicon = require('static-favicon');
var cookieParser = require('cookie-parser');

var session = require('express-session');
var RedisStore = require('connect-redis')(session);

module.exports = function (app) {
  // get all data/stuff of the body (POST) parameters
// parse application/json
  app.use(favicon());
  app.use(logger('dev'));
  app.use(bodyParser.json({limit: '50MB'}));

  app.use(bodyParser.json({type: 'application/vnd.api+json'}));
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride('X-HTTP-Method-Override'));
  app.use(cookieParser());
  app.use(session({
    secret: 'keyboard cat',
    proxy: true,
    store: new RedisStore(),
    resave: true,
    saveUninitialized: true
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.set('passport', passport);

// generic req logger
/*  app.use(function (req, res, next) {
    var self = this;
    function _next() {
      var args = Array.prototype.slice.apply(arguments);
      console.log(req.method, req.url, req.params, req.body);
      next.apply(self, args);
    }

    req.next = _next();
  });*/
};
