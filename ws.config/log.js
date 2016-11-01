'use strict';

const _ = require('lodash');
const path = require('path');
const bunyan = require('bunyan');
const config = require('./config');
const PrettyStream = require('bunyan-prettystream');

module.exports = bunyan.createLogger({
  name: 'WAFFLE_SERVER',
  serializers: _.extend({obj: objSerializer}, bunyan.stdSerializers),
  streams: getBunyanStreams(config.NODE_ENV)
});

function getBunyanStreams(environment) {
  const fileStream = {
    level: config.LOG_LEVEL,
    type: 'rotating-file',
    path: path.join(__dirname, '/../logs/waffle.log'),
    period: 'daily',
    count: 3
  };

  const consoleStream = {
    src: config.NODE_ENV === 'local',
    level: config.LOG_LEVEL,
    stream: getLogStream(environment)
  };

  if (environment === 'production') {
    return [fileStream];
  }

  return [fileStream, consoleStream];
}

function getLogStream(environment) {
  if (environment === 'local') {
    const stream = new PrettyStream();
    stream.pipe(process.stdout);
    return stream;
  }

  return process.stdout;
}

function objSerializer(obj) {
  return obj;
}
