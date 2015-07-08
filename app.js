// import
// save
// analyze

var express = require('express');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);
require('./ws.repository')(serviceLocator.repositories);

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */
