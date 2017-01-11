'use strict';

const logger = require('../ws.config/log');
const config = require('../ws.config/config');
const cache = require('express-redis-cache')({
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

module.exports = cache;
