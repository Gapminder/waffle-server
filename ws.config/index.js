module.exports = function (serviceLocator) {
  const app = serviceLocator.getApplication();

  require('./passport');
  require('./express.config')(app);
  require('./db.config');
};
