'use strict';

module.exports = config => {
  return require('express-redis-cache')({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  });
};

