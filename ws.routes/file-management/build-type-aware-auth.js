'use strict';

module.exports = function(serviceLocator) {
  function invokeNextMiddleware(req, res, next) {
    next();
  }

  var app = serviceLocator.getApplication();
  var authLib = app.get('authLib');
  var isAngular2 = app.get('config').BUILD_TYPE === 'angular2';

  var ensureAuthenticated = isAngular2 ? authLib.getAuthMiddleware() : require('../utils').ensureAuthenticated;
  var authUserSyncMiddleware = isAngular2 ? require('./sync-user') : invokeNextMiddleware;

  return {
    ensureAuthenticated: ensureAuthenticated,
    authUserSyncMiddleware: authUserSyncMiddleware
  }
};
