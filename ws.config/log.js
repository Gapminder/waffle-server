var _ = require('lodash');
var path = require('path');
var winston = require('winston');

module.exports = function (app) {
  'use strict';
  var config = app.get('config');

  var consoleTransport = new (winston.transports.Console)({
    level: 'info',
    timestamp: true,
    json: false
  });
  var dailyRotateFileTransport = new (winston.transports.DailyRotateFile)({
    name: 'file',
    datePattern: '.yyyy-MM-ddTHH',
    filename: path.join(__dirname, '/../logs/waffle.log'),
    level: 'beta',
    timestamp: true,
    json: false,
    prettyPrint: true
  });
  var nodeEnvs = {
    devtest: {level: 'log', transports: [consoleTransport]},
    development: {level: 'info', transports: [consoleTransport]},
    beta: {level: 'warn', transports: [consoleTransport, dailyRotateFileTransport]},
    production: {level: 'error', transports: [dailyRotateFileTransport]}
  };
  var nodeEnv = config.NODE_ENV || config.DEFAULT_NODE_ENV;
  var logLevel = config.LOG_LEVEL || nodeEnvs[nodeEnv].level;
  _.each(nodeEnvs[nodeEnv].transports, function (transport) {
    if (logLevel === 'devtest') {
      transport.silent = true;
    }
    transport.level = logLevel;
  });

  function expandErrors(logger) {
    var oldLogFunc = logger.log;
    logger.log = function () {
      var args = Array.prototype.slice.call(arguments, 0);

      if (args.length >= 2 && args[1] instanceof Error) {
        args[1] = args[1].stack;
      }

      return oldLogFunc.apply(this, args);
    };
    return logger;
  }

  var logger = expandErrors(new (winston.Logger)({ transports: nodeEnvs[nodeEnv].transports }));

  app.set('log', logger);
};
