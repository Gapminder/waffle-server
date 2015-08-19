'use strict';

angular.module('admin.controllers')
  .controller('DetailDimensionValuesController', [
    '$state', 'PublisherCatalogVersionEntry', 'PublisherDetailDimensionValues', 'DimensionEntity',
    function ($state, PublisherCatalogVersionEntry, PublisherDetailDimensionValues, DimensionEntity) {
      var self = this;
      self.versionId = $state.params.versionId;
      self.dimensionId = $state.params.dimensionId;

      // It's data for breadcrumbs dynamic states
      PublisherCatalogVersionEntry.get({id: self.versionId},
        function (resp) {
          self.publisherRecord = {};
          // for previous state in breadcrumbs
          self.publisherRecord.name = resp.data.publisher.name;
          self.versionRecord = resp.data;
        });

      DimensionEntity.get({id: self.dimensionId}, function (resp) {
        self.currentDimension = resp.data;
      });
      //--It's data for breadcrumbs dynamic states


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
        PublisherDetailDimensionValues.get({
          skip: (self.paging.currentPage - 1) * self.limit,
          limit: self.limit,
          versionId: self.versionId,
          dimensionId: self.dimensionId
        }, updateList);
      }

      function updateList(resp) {
        if (resp.error) {
          console.error(resp.error);
          return;
        }

        self.currentData = resp.data.data;
        self.totalItems = resp.data.totalItems;
      }
    }
  ]);
