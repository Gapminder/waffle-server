'use strict';

angular.module('admin.controllers', []);
angular.module('admin.services', []);
angular.module('admin.directives', []);
angular.module('admin.auth', ['ui.router', 'ui.bootstrap']);

angular.module('admin', [
    'ngResource',
    'ui.router',
    'ui.bootstrap',
    'ncy-angular-breadcrumb',
    'admin.controllers',
    'admin.services',
    'admin.directives',
    'admin.auth'
  ]);
// Other libraries are loaded dynamically in the config.js file using the library ocLazyLoad
