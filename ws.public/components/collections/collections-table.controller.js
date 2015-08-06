'use strict';

angular.module('admin.controllers').controller('CollectionsTableController', [
  '$rootScope', '$state', 'CollectionsService', '$scope',
  function CollectionsTableController($rootScope, $state, CollectionsService, $scope) {
    var self = this;
    self.pageTitle = $state.current.data.pageTitle;
    self.pageType = $state.current.data.pageType;
    self.data = [];
    self.currentData = [];
    self.tagline = 'Waffle Server';
    var skip = 0;
    var page = 0;
    self.limit = 10;

    $rootScope.$on('$stateChangeSuccess', function () {
      self.page = 0;
      self.data = [];
    });

    $scope.paging = {currentPage: 1};
    $scope.pageChanged = getData;

    getData();

    function getData() {
      page = $scope.paging.currentPage - 1;
      var params = {
        skip: skip + page * self.limit,
        limit: self.limit,
        list: self.pageType,
        action: ''
      };

      CollectionsService.getData(params, updateList);
    }

    function updateList(err, data) {
      if (err) {
        console.error(err);
        return;
      }
      self.currentData = data.data;
      $scope.totalItems = data.totalItems;
    }
  }
]);
