import { logger } from '../ws.config/log';
import { config } from '../ws.config/config';

import * as expressRedisCache from 'express-redis-cache';
import { constants } from './constants';

const cache = expressRedisCache({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT
});

cache.on('error', (error: string) => {
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

const statusCodesExpirationConfig = {
  expire: {
    500: 1,
    xxx: constants.DDF_REDIS_CACHE_LIFETIME
  }
};

export { cache, statusCodesExpirationConfig };
