var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var path = require('path');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);

//var routes = require('./ws.routes/index');
//var api = require('./ws.routes/api');

//app.use('/', routes);
//app.use('/api', api);

// web
require('./ws.web')(app);

app.use(express.static(path.join(__dirname, '/ws.web/public')));
app.use(bodyParser.urlencoded({extended: 'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({type: 'application/vnd.api+json'}))
app.use(methodOverride());

// start server
var config = app.get('config');

app.listen(config.PORT, function () {
  'use strict';
  console.log('\nExpress server listening on port %d in %s mode', config.PORT, app.settings.env);
});
