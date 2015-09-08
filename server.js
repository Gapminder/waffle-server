var express = require('express');
var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);

// routes ==================================================
// configure our routes
require('./ws.routes/index')(serviceLocator);

// start app ===============================================
// startup our app at http://localhost:3000
var config = app.get('config');
app.listen(config.PORT);

// shoutout to the user
console.log('\nExpress server listening on port %d in %s mode', config.PORT, app.settings.env);

// expose app
exports = module.exports = app;
