module.exports = function (serviceLocator) {
  require('./export')(serviceLocator);
  require('./stats')(serviceLocator);
};
