'use strict';

angular.module('admin.controllers')
  .controller('PublishersCatalogVersionsController', [
    '$state', 'PublisherEntry', 'PublisherCatalogVersionsEntry',
    function ($state, PublisherEntry, PublisherCatalogVersionsEntry) {
      var self = this;

      self.publisherId = $state.params.publisherId;
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
        PublisherEntry.get({id: self.publisherId},
          function (resp) {
            self.publisherRecord = resp.data;
          });
        PublisherCatalogVersionsEntry.get({
          publisherId: self.publisherId
        }, updateList);
      }

      function updateList(resp) {
        if (resp.error) {
          console.error(resp.error);
          return;
        }
        self.currentData = resp.data;
      }
    }
  ]);
