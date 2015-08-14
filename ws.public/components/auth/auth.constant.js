angular.module('admin.auth', ['ui.router', 'ui.bootstrap'])
  /*Constants regarding user login defined here*/
  .constant('USER_ROLES', {
    all : '*',
    admin : 'admin',
    moderator : 'moderator',
    guest : 'guest'
  }).constant('AUTH_EVENTS', {
    loginSuccess : 'auth-login-success',
    loginFailed : 'auth-login-failed',
    logoutSuccess : 'auth-logout-success',
    sessionTimeout : 'auth-session-timeout',
    notAuthenticated : 'auth-not-authenticated',
    notAuthorized : 'auth-not-authorized'
  });
