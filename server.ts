// import 'newrelic';

import * as express from 'express';
import { connectToDb } from './ws.config/db.config';
import { config } from './ws.config/config';
import { logger } from './ws.config/log';
import './ws.repository';

import * as WarmupUtils from './ws.utils/cache-warmup';
import * as ImportUtils from './ws.import/utils/import-ddf.utils';

import { reposService } from 'waffle-server-repo-service';
import { UsersService } from './ws.services/users.service';
import { ServiceLocator } from './ws.service-locator';
import { DbService } from './ws.services/db.service';

import { Application } from './application';
import { createLongRunningQueriesKiller } from './ws.utils/long-running-queries-killer';
import { Connection } from 'mongoose';
import { usersRepository } from './ws.repository/ddf/users/users.repository';

reposService.logger = logger;

process.setMaxListeners(0);

process.on('uncaughtException', function (reason: Error): void {
  logger.error(reason);
});

connectToDb((error: any, db: Connection) => {

  const serviceLocator = ServiceLocator.create(express());
  serviceLocator.set('config', config);
  serviceLocator.set('importUtils', ImportUtils);
  serviceLocator.set('warmupUtils', WarmupUtils);
  serviceLocator.set('usersService', new UsersService(usersRepository));
  serviceLocator.set('reposService', reposService);

  const dbService = new DbService(db);
  serviceLocator.set('dbService', dbService);
  serviceLocator.set('longRunningQueriesKiller', createLongRunningQueriesKiller(dbService));

  new Application(serviceLocator)
    .run()
    .catch((startupError: any) => {
      logger.error(startupError);
      process.exit(1);
    });
});
