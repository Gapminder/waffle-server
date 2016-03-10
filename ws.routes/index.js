module.exports = function (serviceLocator) {
  require('./adapter')(serviceLocator);
  require('./geo')(serviceLocator);
  require('./suggestions')(serviceLocator);

  require('./auth')(serviceLocator);
  require('./users')(serviceLocator);

  require('./file-management')(serviceLocator);
  require('./pipes')(serviceLocator);
  require('./graphs')(serviceLocator);
};
