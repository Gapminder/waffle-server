'use strict';

angular.module('admin.controllers')
  .controller('PublishersCatalogVersionsController', [
    '$state', 'PublisherEntry', 'PublisherCatalogVersionsEntry',
    function ($state, PublisherEntry, PublisherCatalogVersionsEntry) {
      var self = this;

      self.publisherId = $state.params.publisherId;
      self.pageChanged = getData;
      self.refresh = refresh;

      self.goNext = function goNext(versionId) {
        $state.go('admin.home.publishers.catalogVersionDetails', {
          publisherId: self.publisherId, versionId: versionId
        });
      };

      refresh(false);

      function refresh(isForce) {
        initData();
        getData(isForce);
      }

      function initData() {
        self.currentData = [];
        self.limit = 10;
        self.paging = {currentPage: 1};
      }

      function getData(isForce) {
        PublisherEntry.get({id: self.publisherId},
          function (resp) {
            self.publisherRecord = resp.data;
          });

        var query = {
          publisherId: self.publisherId
        };

        if (isForce) {
          query.force = true;
        }

        PublisherCatalogVersionsEntry.get(query, updateList);
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
