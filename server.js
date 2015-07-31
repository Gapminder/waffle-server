var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var path = require('path');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);

// get all data/stuff of the body (POST) parameters
// parse application/json
app.use(bodyParser.json());

// parse application/vnd.api+json as json
app.use(bodyParser.json({type: 'application/vnd.api+json'}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

// override with the X-HTTP-Method-Override header in the request. simulate DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override'));

// set the static files location /public/img will be /img for users
app.use(express.static(path.join(__dirname, '/ws.public')));

// start server
var config = app.get('config');

// routes ==================================================
// configure our routes
require('./ws.routes/index')(app, serviceLocator);
require('./ws.routes/home')(app);

// start app ===============================================
// startup our app at http://localhost:3000
app.listen(config.PORT);

// shoutout to the user
console.log('\nExpress server listening on port %d in %s mode', config.PORT, app.settings.env);

// expose app
exports = module.exports = app;
