// import
// save
// analyze
/*eslint-disable*/
var express = require('express');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);
require('./ws.plugins')(serviceLocator, function (err) {
  if (err) {
    console.error(err);
  }

  process.exit(0);
});

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */
