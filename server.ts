import 'newrelic';

import * as express from 'express';
import { config } from './ws.config/config';
import { logger } from './ws.config/log';
import * as bodyParser from 'body-parser';
import { ServiceLocator } from './ws.service-locator';
import './ws.repository';
import * as Config from './ws.config';
import { registerRoutes } from './ws.routes';
import { makeDefaultUser } from './make-default-user';
import * as Cache from './ws.utils/cache-warmup';
import * as importUtils from './ws.import/utils/import-ddf.utils';
import {reposService} from 'waffle-server-repo-service';

reposService.logger = logger;
const app: express.Application = express();

process.on('uncaughtException', function (err: Error): void {
  logger.error(err);
});

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));

const serviceLocator = ServiceLocator.create(app);

Config.configureWaffleServer(app);

registerRoutes(serviceLocator);

importUtils.cloneImportedDdfRepos().then(() => {
  app.listen(config.INNER_PORT, () => {
    logger.info('\nExpress server listening on port %d in %s mode', config.INNER_PORT, app.settings.env);

    makeDefaultUser();

    if (config.THRASHING_MACHINE) {

      Cache.warmUpCache((error: string, warmedQueriesAmount: any) => {
        if (error) {
          return logger.error(error, 'Cache warm up failed.');
        }

        if (warmedQueriesAmount) {
          return logger.info(`Cache is warm. Amount of warmed queries: ${warmedQueriesAmount}`);
        }

        return logger.info(`There are no queries to warm up cache OR queries were executed with no success`);
      });
    }
  });
});
