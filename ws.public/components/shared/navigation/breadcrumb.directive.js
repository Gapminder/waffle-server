'use strict';
angular.module('admin.directives')
  .directive('adminBreadcrumb', function () {
    return {
      template: '<br><div ncy-breadcrumb></div>',
    }
  });
