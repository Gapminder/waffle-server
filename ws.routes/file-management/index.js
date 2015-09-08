module.exports = function (serviceLocator) {
  require('./file-upload')(serviceLocator);
  require('./files.crud')(serviceLocator);
};
