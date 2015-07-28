'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');

module.exports = function (serviceLocator) {
  require('./api')(router, serviceLocator);
  require('./auth')(router, serviceLocator);

  // frontend routes =========================================================
  // route to handle all angular requests
  router.get('*', function(req, res) {
    // load our public/index.html file
    res.sendFile('index.html', {root: path.join(__dirname, '../ws.public')});
  });

  return router;
};
