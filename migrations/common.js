var app = require('express')();
var serviceLocator = require('../ws.service-locator')(app);
require('../ws.config')(app);
require('../ws.repository')(serviceLocator);

module.exports = app;
