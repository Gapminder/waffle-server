'use strict';

module.exports = function (app, serviceLocator) {
  require('./api/collections')(app, serviceLocator);
  require('./api/cyper')(app, serviceLocator);
  require('./api/spreadsheet')(app, serviceLocator);
  require('./api/import')(app, serviceLocator);
  require('./auth')(app, serviceLocator);
};
