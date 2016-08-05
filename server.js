require('newrelic');

var express = require('express');

var app = express();

const config = require('./ws.config/config');

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '10mb'}));

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.repository')();
require('./ws.config')(serviceLocator);
require('./ws.routes')(serviceLocator);

// FIXME: make-default-user is the temporary solution and should be deleted as soon as WS will have a registration functionality
require('./make-default-user')();

app.listen(config.INNER_PORT);

console.log('\nExpress server listening on port %d in %s mode', config.INNER_PORT, app.settings.env);
exports = module.exports = app;
