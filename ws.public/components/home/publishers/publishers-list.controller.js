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
      self.record = null;
      self.pageChanged = getData;

      console.log($state.current.name);
      ($state.current.name.indexOf('.edit') > 0 ? getRecord : getData)();

      function getData() {
        self.record = null;
        CollectionsService.getData({
          skip: (self.paging.currentPage - 1) * self.limit,
          limit: self.limit,
          list: '',
          action: 'publishers'
        }, updateList);
      }

      function getRecord() {
        console.log(11111);
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
