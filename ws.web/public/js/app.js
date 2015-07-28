'use strict';

(function () {
  // public/js/app.js
  angular.module('adminPanel', [
    'ui.router',
    'oc.lazyLoad',
    'ui.bootstrap',
    'ngIdle',
    'ngCookies',
    'MainCtrl', 'IndexCtrl', 'UserCtrl', 'UserService'
  ]);
})();

// Other libraries are loaded dynamically in the config.js file using the library ocLazyLoad
