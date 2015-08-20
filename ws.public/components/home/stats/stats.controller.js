'use strict';

angular.module('admin.controllers')
  .controller('DetailStatsController', [
    '$state', 'PublisherCatalogVersionEntry', 'Chart',
    function ($state, PublisherCatalogVersionEntry, Chart) {
      var self = this;
      self.versionId = $state.params.versionId;

      // It's data for breadcrumbs dynamic states
      PublisherCatalogVersionEntry.get({id: self.versionId},
        function (resp) {
          self.publisherRecord = {};
          // for previous state in breadcrumbs
          self.publisherRecord.name = resp.data.publisher.name;
          self.versionRecord = resp.data;
        });
      //--It's data for breadcrumbs dynamic states
    }
  ]);
