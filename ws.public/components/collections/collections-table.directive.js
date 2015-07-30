'use strict';
angular.module('adminPanel.directives')
  .directive('adminCollectionsTable', function adminCollectionTable() {
    var directive = {
      templateUrl: '/components/collections/collections-table.html',
      scope: true,
      restrict: 'EA',
      bindToController: true,
      controller: 'CollectionsTableController',
      controllerAs: 'ctrl'
    };

    return directive;
  });
