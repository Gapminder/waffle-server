'use strict';

module.exports = function (app, serviceLocator) {
  require('./api/collections')(app, serviceLocator);
  require('./api/cyper')(app, serviceLocator);
  require('./auth')(app, serviceLocator);
};
