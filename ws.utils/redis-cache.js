'use strict';

const config = require('../ws.config/config');

module.exports = require('express-redis-cache')({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT
});

