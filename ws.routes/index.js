'use strict';

var path = require('path');

module.exports = function (app, serviceLocator) {
  app.get('/api', function (req, res, next) {
    next();
  });

  // frontend routes =========================================================
  // route to handle all angular requests
  app.get('*', function(req, res) {
    // load our public/index.html file
    res.sendFile('index.html', {root: path.join(__dirname, '../ws.web/public')});
  });
};
