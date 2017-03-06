import { logger } from '../ws.config/log';
import { config } from '../ws.config/config';

import * as expressRedisCache from 'express-redis-cache';

const cache = expressRedisCache({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT
});

cache.on('error', (error: any) => {
  logger.error(error);
});

cache.on('message', (message: any) => {
  logger.debug(message);
});

cache.on('connected', () => {
  logger.debug('Express redis cache connected to redis!');
});

cache.on('disconnected', () => {
  logger.debug('Express redis cache disconnected from redis!');
});

cache.on('deprecated', (deprecated: any) => {
  logger.warn('deprecated warning', {
    type: deprecated.type,
    name: deprecated.name,
    substitute: deprecated.substitute,
    file: deprecated.file,
    line: deprecated.line
  });
});

export { cache };
