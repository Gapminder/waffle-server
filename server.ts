import 'newrelic';

import * as express from 'express';

const app = express();

import * as config from './ws.config/config';
import * as logger from './ws.config/log';

process.on('uncaughtException', function(err) {
  logger.error(err);
});

import * as bodyParser from 'body-parser';
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '10mb'}));

import * as ServiceLocator from './ws.service-locator';
const serviceLocator = ServiceLocator(app);

import './ws.repository';
import * as Config from './ws.config';
Config(serviceLocator);
import * as Routes from './ws.routes';
Routes(serviceLocator);

import * as makeDefaultUser from './make-default-user';
import * as Cache from './ws.utils/cache-warmup';

app.listen(config.INNER_PORT, () => {
  console.log('\nExpress server listening on port %d in %s mode', config.INNER_PORT, app.settings.env);

  makeDefaultUser();

  if(config.THRASHING_MACHINE) {

    Cache.warmUpCache((error, warmedQueriesAmount)=> {
      if(error) {
        return logger.error(error, 'Cache warm up failed.');
      }

      if (warmedQueriesAmount) {
        return logger.info(`Cache is warm. Amount of warmed queries: ${warmedQueriesAmount}`);
      }

      return logger.info(`There are no queries to warm up cache OR queries were executed with no success`);
    });
  }
});
