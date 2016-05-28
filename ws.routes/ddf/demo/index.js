'use strict';

module.exports = serviceLocator => {
  require('./demo.controller')(serviceLocator);
};
