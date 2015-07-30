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

    $scope.currentPage = 1;
    $scope.pageChanged = pageChanged;

    getData();

    /////////////

    function pageChanged() {
      var start = self.limit * ($scope.currentPage - 1);
      var end = start + self.limit;
      self.currentData = self.data.slice(start, end);
    }

    function getData() {
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

      self.data = self.data.concat(data.data);
      $scope.totalItems = self.data.length;

      if (!self.currentData.length) {
        self.currentData = data.data;
      }

      if (data.data.length === self.limit) {
        page++;
        getData();
      }
    }
  }
]);
