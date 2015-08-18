'use strict';

angular.module('admin.controllers')
  .controller('PublishersListController', [
    '$state', 'Publishers', 'PublisherEntry',
    function ($state, Publishers, PublisherEntry) {
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
        Publishers.get({
          skip: (self.paging.currentPage - 1) * self.limit,
          limit: self.limit
        }, updateList);
      }

      function updateList(resp) {
        if (resp.error) {
          console.error(resp.error);
          return;
        }

        self.currentData = resp.data;
        self.totalItems = resp.totalItems;
      }
    }
  ]);
