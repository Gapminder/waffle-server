var _ = require('lodash');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var config = app.get('config');
  var authLib = app.get('authLib');
  var ensureAuthenticated = config.BUILD_TYPE === 'angular2' ? authLib.getAuthMiddleware : require('../utils').ensureAuthenticated;

  app.get('/api/users/me', function (req, res) {
    if (!req.user) {
      return res.json({success: false});
    }
    return res.json({success: true, data: {user: _.pick(req.user, ['_id', 'name', 'email', 'username', 'image'])}});
  });
};
