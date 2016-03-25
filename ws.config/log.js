var _ = require('lodash');
var path = require('path');
var winston = require('winston');
var dailyRotateFile = require('winston-daily-rotate-file');

module.exports = function (app) {
  var config = app.get('config');

  var consoleTransport = new (winston.transports.Console)({
    name: 'console',
    level: config.LOG_LEVEL,
    handleExceptions: true,
    timestamp: true,
    colorize: true,
    // prettyPrint: true,
    humanReadableUnhandledException: true,
    showLevel: true,
    json: false
  });

  var dailyRotateFileTransport = new (dailyRotateFile)({
    name: 'file',
    datePattern: '.yyyy-MM-ddTHH',
    filename: path.join(__dirname, '/../logs/waffle.log'),
    level: config.LOG_LEVEL,
    timestamp: true,
    json: false,
    handleExceptions: true,
    prettyPrint: true
  });

  var defaultTransports = {
    console: consoleTransport,
    file: dailyRotateFileTransport
  };

  var transports = config.LOG_TRANSPORTS.map(transportName => {
    var transport = defaultTransports[transportName];

    if (!transport) {
      throw new Error('Given LOG_TRANSPORTS contains not supported value');
    }

    return transport;
  });

  var logger = new (winston.Logger)({
    exitOnError: false,
    transports: transports
  });

  app.set('log', logger);

  return logger;
};
