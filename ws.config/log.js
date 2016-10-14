'use strict';

const _ = require('lodash');
const path = require('path');
const bunyan = require('bunyan');

const config = require('./config');

function objSerializer(obj) {
  return obj;
}

module.exports = bunyan.createLogger({
  name: 'WAFFLE_SERVER',
  serializers: _.extend({obj: objSerializer}, bunyan.stdSerializers),
  streams: [{
    level: config.LOG_LEVEL,
    type: 'rotating-file',
    path: path.join(__dirname, '/../logs/waffle.log'),
    period: 'hourly',
    count: 10
  },
    {
      level: config.LOG_LEVEL,
      stream: process.stdout
    },]
});
