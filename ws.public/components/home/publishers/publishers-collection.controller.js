'use strict';

angular.module('admin.controllers')
  .controller('PublishersCollectionController', [
    '$state', 'CollectionsService',
    function ($state, CollectionsService) {
      var self = this;
      self.data = [];
      self.currentData = [];
      self.limit = 10;

      self.paging = {currentPage: 1};
      self.pageChanged = getData;

      getData();

      function getData() {
        CollectionsService.getData({
          skip: (self.paging.currentPage - 1) * self.limit,
          limit: self.limit,
          list: '',
          action: 'publishers'
        }, updateList);
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
