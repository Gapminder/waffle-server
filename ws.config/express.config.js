'use strict';

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const passport = require('passport');
const logger = require('morgan');
const favicon = require('static-favicon');
const cookieParser = require('cookie-parser');

const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const REQUEST_BODY_SIZE_LIMIT = '50mb';

module.exports = app => {
  // get all data/stuff of the body (POST) parameters
// parse application/json
  app.use(favicon());
  app.use(logger('dev'));
  app.use(bodyParser.json({limit: REQUEST_BODY_SIZE_LIMIT, type: 'application/vnd.api+json'}));
  app.use(bodyParser.urlencoded({limit: REQUEST_BODY_SIZE_LIMIT, extended: true}));
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
