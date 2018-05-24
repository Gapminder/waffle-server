import * as expressBunyanLogger from 'express-bunyan-logger';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { config } from './config';

const REQUEST_BODY_SIZE_LIMIT = '50mb';

export function configureExpress(app: express.Application): void {
  if (!config.IS_PRODUCTION) {
    app.use(expressBunyanLogger({
      name: 'logger',
      streams: [{
        level: 'info',
        stream: process.stdout
      }]
    }));
  }
  app.use(bodyParser.json({ limit: REQUEST_BODY_SIZE_LIMIT }));
  app.use(bodyParser.urlencoded({ limit: REQUEST_BODY_SIZE_LIMIT, extended: true }));
}
