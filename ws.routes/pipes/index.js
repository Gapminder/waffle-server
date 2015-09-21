module.exports = function (serviceLocator) {
  require('./dimensions-recognize')(serviceLocator);
  require('./dimensions-crud')(serviceLocator);
};
