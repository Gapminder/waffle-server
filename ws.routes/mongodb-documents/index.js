'use strict';

module.exports = function (serviceLocator) {
  require('./populate-document.controller.js')(serviceLocator);
};
