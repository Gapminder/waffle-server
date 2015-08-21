'use strict';

angular.module('admin.controllers')
  .controller('PublishersCatalogVersionDetailsController', [
    '$state', 'PublisherCatalogVersionEntry', 'PublisherCatalogVersionCounters',
    function ($state, PublisherCatalogVersionEntry, PublisherCatalogVersionCounters) {
      var self = this;
      self.versionId = $state.params.versionId;
      self.publisherId = $state.params.publisherId;

      PublisherCatalogVersionEntry.get({id: self.versionId},
        function (resp) {
          self.publisherRecord = {};
          // for previous state in breadcrumbs
          self.publisherRecord.name = resp.data.publisher.name;
          self.versionRecord = resp.data;
        });

      PublisherCatalogVersionCounters.get({
          versionId: self.versionId
        },
        function (resp) {
          if (resp.error) {
            console.log(resp.error);
          }

          self.data = resp.data;
        });
    }
  ]);
