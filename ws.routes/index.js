'use strict';
var express = require('express');
var router = express.Router();

module.exports = function (serviceLocator) {
  require('./api')(router, serviceLocator);
  require('./auth')(router, serviceLocator);

  return router;
};
