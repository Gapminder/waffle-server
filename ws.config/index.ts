import './passport';
import './db.config';

import { configureExpress } from './express.config';
import * as express from 'express';

export function configureWaffleServer(app: express.Application): void {
  configureExpress(app);
}
