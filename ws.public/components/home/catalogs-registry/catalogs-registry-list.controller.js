'use strict';

angular.module('admin.controllers')
  .controller('PublisherCatalogsListController', [
    '$state', 'PublisherCatalogs', 'PublisherCatalogEntry',
    function ($state, PublisherCatalogs, PublisherCatalogEntry) {
      var self = this;

      self.deleteRecord = function deleteRecord(id) {
        if (confirm('Are you sure?')) {
          PublisherCatalogEntry.deleteRecord({id: id}, function (resp) {
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
        PublisherCatalogs.getData({
          skip: (self.paging.currentPage - 1) * self.limit,
          limit: self.limit,
          list: '',
          action: 'publisherCatalogs'
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
