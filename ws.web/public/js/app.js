'use strict';

(function () {
  angular.module('adminPanel', [
    'ui.router',
    'oc.lazyLoad',
    'ui.bootstrap',
    'ngIdle'
  ]);
})();

// Other libraries are loaded dynamically in the config.js file using the library ocLazyLoad
