module.exports = function (serviceLocator) {
  require('./geo-properties')(serviceLocator);
  require('./service')(serviceLocator);
};
