require('newrelic');

const express = require('express');

const app = express();

const config = require('./ws.config/config');
const logger = require('./ws.config/log');

process.on('uncaughtException', function(err) {
  logger.error(err);
});

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '10mb'}));

const serviceLocator = require('./ws.service-locator')(app);

require('./ws.repository');
require('./ws.config')(serviceLocator);
require('./ws.routes')(serviceLocator);

app.listen(config.INNER_PORT, () => {
  console.log('\nExpress server listening on port %d in %s mode', config.INNER_PORT, app.settings.env);

  require('./make-default-user')();

  if(config.THRASHING_MACHINE) {
    require('./ws.utils/cache-warmup').warmUpCache((error, warmedQueriesAmount)=> {
      if(error) {
        return logger.error(error, 'Cache warm up failed.');
      }

      if (warmedQueriesAmount) {
        return logger.info(`Cache is warm. Amount of warmed queries: ${warmedQueriesAmount}`);
      }

      return logger.info(`There are no queries to warm up cache`);
    });
  }
});
