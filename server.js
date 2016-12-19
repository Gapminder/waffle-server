require('newrelic');

var express = require('express');

var app = express();

const config = require('./ws.config/config');
const logger = require('./ws.config/log');

process.on('uncaughtException', function(err) {
  logger.error(err);
});

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '10mb'}));

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.repository');
require('./ws.config')(serviceLocator);
require('./ws.routes')(serviceLocator);

// FIXME: make-default-user is the temporary solution and should be deleted as soon as WS will have a registration functionality
require('./make-default-user')();

warmUpCache();

app.listen(config.INNER_PORT);

console.log('\nExpress server listening on port %d in %s mode', config.INNER_PORT, app.settings.env);
exports = module.exports = app;

function warmUpCache() {
  if(config.THRASHING_MACHINE) {
    require('./ws.utils/cache-warmup').warmUpCache((error, warmedQueriesAmount)=> {
      if(error) {
        return logger.error(error, 'Cache warm up failed.');
      }
      return logger.info(`Cache is warm. Amount of warmed queries: ${warmedQueriesAmount}`);
    });
  }
}
