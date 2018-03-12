// import 'newrelic';

import * as express from 'express';
import { connectToDb } from './ws.config/db.config';
import { config } from './ws.config/config';
import { logger } from './ws.config/log';
import './ws.repository';

import * as WarmupUtils from './ws.utils/cache-warmup';
import * as ImportUtils from './ws.import/utils/import-ddf.utils';
import * as ImportService from './ws.import/import-ddf';

import { reposService } from 'waffle-server-repo-service';
import { UsersService } from './ws.services/users.service';
import { ServiceLocator } from './ws.service-locator';
import { DbService } from './ws.services/db.service';
import { TelegrafService } from './ws.services/telegraf.service';

import { Application } from './application';
import { createLongRunningQueriesKiller } from './ws.utils/long-running-queries-killer';
import { Connection } from 'mongoose';
import { usersRepository } from './ws.repository/ddf/users/users.repository';
import Signals = NodeJS.Signals;

reposService.logger = logger;

process.setMaxListeners(0);

connectToDb((error: any, db: Connection) => {

  const serviceLocator = ServiceLocator.create(express());
  serviceLocator.set('config', config);
  serviceLocator.set('importService', ImportService);
  serviceLocator.set('importUtils', ImportUtils);
  serviceLocator.set('warmupUtils', WarmupUtils);
  serviceLocator.set('usersService', new UsersService(usersRepository));
  serviceLocator.set('reposService', reposService);
  serviceLocator.set('telegrafService', new TelegrafService());

  const dbService = new DbService(db);
  serviceLocator.set('dbService', dbService);
  serviceLocator.set('longRunningQueriesKiller', createLongRunningQueriesKiller(dbService));

  const application = new Application(serviceLocator);

  application
    .run()
    .catch((startupError: any) => {
      logger.error(startupError);
      process.exit(1);
    });

  process.on('uncaughtException', function (reason: Error): void {
    logger.error('Process Event: uncaughtException', reason);
    application.telegrafService.onInstanceStateChanged();
  });

  process.on('beforeExit', function (code: number): void {
    logger.error('Process Event: beforeExit', code);
    application.telegrafService.onInstanceStateChanged();
  });

  process.on('exit', function (code: number): void {
    logger.error('Process Event: exit', code);
    application.telegrafService.onInstanceStateChanged();
  });

  process.on('disconnect', function (): void {
    logger.error('Process Event: disconnect');
    application.telegrafService.onInstanceStateChanged();
  });

});
