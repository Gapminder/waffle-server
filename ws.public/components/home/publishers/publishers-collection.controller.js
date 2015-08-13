'use strict';

angular.module('admin.controllers').controller('PublishersCollectionController', [
  '$rootScope', '$state', 'CollectionsService',
  function PublishersCollectionController($rootScope, $state, CollectionsService) {
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

    self.paging = {currentPage: 1};
    self.pageChanged = getData;

    getData();

    function getData() {
      page = self.paging.currentPage - 1;
      var params = {
        skip: skip + page * self.limit,
        limit: self.limit,
        list: '',
        action: 'publishers'
      };

      CollectionsService.getData(params, updateList);
    }

    function updateList(err, data) {
      if (err) {
        console.error(err);
        return;
      }
      self.currentData = data.data;
      self.totalItems = data.totalItems;
    }
  }
]);
