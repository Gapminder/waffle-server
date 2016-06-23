var path = require('path');
var express = require('express');

var app = express();

var bodyParser = require('body-parser');
// app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.repository')(serviceLocator);
require('./ws.config')(app);

// routes ==================================================
// configure our routes
require('./ws.routes/index')(serviceLocator);

// start app ===============================================
// startup our app at http://localhost:3000
var config = app.get('config');

// set the static files location /public/img will be /img for users
app.use(express.static(path.join(__dirname, './ws.public')));
// route to handle all angular requests
app.get('*', function(req, res) {
  // load our public/index.html file
  res.sendFile('index.html', {root: path.join(__dirname, './ws.public')});
});

app.listen(config.INNER_PORT);

// shoutout to the user
console.log('\nExpress server listening on port %d in %s mode', config.INNER_PORT, app.settings.env);

// expose app
exports = module.exports = app;
