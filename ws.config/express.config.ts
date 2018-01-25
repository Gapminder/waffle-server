import * as logger from 'morgan';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { config } from './config';
import FastifyApp from '../fastify-wrapper';

const REQUEST_BODY_SIZE_LIMIT = '50mb';

export function configureExpress(app: express.Application | FastifyApp): void {
  if (!config.IS_PRODUCTION) {
    (app.use as any)(logger('dev'));
  }
  (app.use as any)(bodyParser.json({ limit: REQUEST_BODY_SIZE_LIMIT }));
  (app.use as any)(bodyParser.urlencoded({ limit: REQUEST_BODY_SIZE_LIMIT, extended: true }));
}
