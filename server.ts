import 'newrelic';

import * as express from 'express';

const app: express.Application = express();

import { config } from './ws.config/config';
import { logger } from './ws.config/log';

process.on('uncaughtException', function(err) {
  logger.error(err);
});

import * as bodyParser from 'body-parser';
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '10mb'}));

import { ServiceLocator } from './ws.service-locator';
const serviceLocator = ServiceLocator.create(app);

import './ws.repository';
import * as Config from './ws.config';
Config.configureWaffleServer(app);

import { registerRoutes } from './ws.routes';
registerRoutes(serviceLocator);

import {makeDefaultUser} from './make-default-user';
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
