'use strict';

const _ = require('lodash');
const path = require('path');
const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

const config = require('./config');

function objSerializer(obj) {
  return obj;
}

module.exports = bunyan.createLogger({
  name: 'WAFFLE_SERVER',
  serializers: _.extend({obj: objSerializer}, bunyan.stdSerializers),
  streams: [
    {
      level: config.LOG_LEVEL,
      type: 'rotating-file',
      path: path.join(__dirname, '/../logs/waffle.log'),
      period: 'daily',
      count: 3
    },
    {
      src: config.NODE_ENV === 'development' || config.NODE_ENV === 'local',
      level: config.LOG_LEVEL,
      stream: prettyStdOut
    }
  ]
});
