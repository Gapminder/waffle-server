'use strict';

module.exports = function (serviceLocator) {
  require('./populate-documents.controller.js')(serviceLocator);
};
