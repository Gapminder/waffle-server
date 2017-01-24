import { logger } from '../ws.config/log';
import { config } from '../ws.config/config';

import * as expressRedisCache from 'express-redis-cache';

const cache = expressRedisCache({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT
});

cache.on('error', function (error) {
  logger.error(error);
});

cache.on('message', function (message) {
  logger.debug(message);
});

cache.on('connected', function () {
  logger.debug('Express redis cache connected to redis!');
});

cache.on('disconnected', function () {
  logger.debug('Express redis cache disconnected from redis!');
});

cache.on('deprecated', function (deprecated) {
  logger.warn('deprecated warning', {
    type: deprecated.type,
    name: deprecated.name,
    substitute: deprecated.substitute,
    file: deprecated.file,
    line: deprecated.line
  });
});

export { cache };
