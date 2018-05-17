// import 'newrelic';

import * as express from 'express';
import { config } from './ws.config/config';
import { logger } from './ws.config/log';

import { ServiceLocator } from './ws.service-locator';

import { Application } from './application';

process.setMaxListeners(0);

process.on('uncaughtException', function (reason: Error): void {
  logger.error('Process Event: uncaughtException', reason);
});

process.on('beforeExit', function (code: number): void {
  logger.info('Process Event: beforeExit', code);
});

process.on('exit', function (code: number): void {
  logger.info('Process Event: exit', code);
});

process.on('disconnect', function (): void {
  logger.info('Process Event: disconnect');
});

const serviceLocator = ServiceLocator.create(express());
serviceLocator.set('config', config);

const application = new Application(serviceLocator);

application
  .run();
