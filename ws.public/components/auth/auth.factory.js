angular.module('admin.auth')
  .factory('Auth', [ '$resource', '$state', 'Session', 'AUTH_EVENTS',
    function($resource, $state, Session, AUTH_EVENTS) {
      return {
        login: login,
        isAuthenticated: isAuthenticated,
        isAuthorized: isAuthorized,
        logout: logout
      };

      function login () {
      }

      function isAuthenticated () {
      }

      function isAuthorized () {
      }

      function logout () {
      }
    } ]);
