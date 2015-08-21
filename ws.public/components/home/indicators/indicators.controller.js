'use strict';

angular.module('admin.controllers')
  .controller('DetailIndicatorsController', [
    '$state', 'PublisherCatalogVersionEntry', 'PublisherDetailIndicators',
    function ($state, PublisherCatalogVersionEntry, PublisherDetailIndicators) {
      var self = this;
      self.versionId = $state.params.versionId;
      self.publisherId = $state.params.publisherId;

      // It's data for breadcrumbs dynamic states
      PublisherCatalogVersionEntry.get({id: self.versionId},
        function (resp) {
          self.publisherRecord = {};
          // for previous state in breadcrumbs
          self.publisherRecord.name = resp.data.publisher.name;
          self.versionRecord = resp.data;
        });
      //--It's data for breadcrumbs dynamic states

      PublisherDetailIndicators.get({versionId: self.versionId}, function (resp) {
        self.currentData = resp.data;
      });
    }
  ]);
