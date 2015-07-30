'use strict';
angular.module('admin.directives')
  .directive('adminCollectionsBreadcrumb', function adminCollectionTable() {
    var directive = {
      templateUrl: '/components/collections/collections-breadcrumb.html',
      scope: true,
      restrict: 'EA',
      bindToController: true,
      controller: 'CollectionsBreadcrumbController',
      controllerAs: 'ctrl'
    };

    return directive;
  });
