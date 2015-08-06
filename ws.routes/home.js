'use strict';
var path = require('path');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();

  // frontend routes =========================================================
  // route to handle all angular requests
  app.get('*', function(req, res) {
    // load our public/index.html file
    res.sendFile('index.html', {root: path.join(__dirname, '../ws.public')});
  });
};
