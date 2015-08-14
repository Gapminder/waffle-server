'use strict';

angular.module('admin.controllers')
  .controller('PublishersListController', [
    '$state', 'CollectionsService', 'PublisherEntry',
    function ($state, CollectionsService, PublisherEntry) {
      var self = this;

      self.deleteRecord = function deleteRecord(id) {
        if (confirm('Are you sure?')) {
          PublisherEntry.deleteRecord({id: id}, function (resp) {
            if (resp.error) {
              console.log(resp.error);
            } else {
              var currentRecord = _.findWhere(self.currentData, {_id: id});
              if (currentRecord) {
                self.currentData.splice(self.currentData.indexOf(currentRecord), 1);
              }
            }
          });
        }
      };

      self.pageChanged = getData;
      self.refresh = refresh;

      refresh();

      function refresh() {
        initData();
        getData();
      }

      function initData() {
        self.currentData = [];
        self.limit = 10;
        self.paging = {currentPage: 1};
      }

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
