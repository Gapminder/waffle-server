'use strict';

angular.module('admin.controllers')
  .controller('DetailIndicatorValuesController', [
    '$state', 'PublisherCatalogVersionEntry', 'PublisherDetailIndicatorValues', 'IndicatorEntity',
    function ($state, PublisherCatalogVersionEntry, PublisherDetailIndicatorValues, IndicatorEntity) {
      var self = this;
      self.versionId = $state.params.versionId;
      self.publisherId = $state.params.publisherId;
      self.indicatorId = $state.params.indicatorId;

      // It's data for breadcrumbs dynamic states
      PublisherCatalogVersionEntry.get({id: self.versionId},
        function (resp) {
          self.publisherRecord = {};
          // for previous state in breadcrumbs
          self.publisherRecord.name = resp.data.publisher.name;
          self.versionRecord = resp.data;
        });

      IndicatorEntity.get({id: self.indicatorId}, function (resp) {
        self.currentIndicator = resp.data;
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
        PublisherDetailIndicatorValues.get({
          skip: (self.paging.currentPage - 1) * self.limit,
          limit: self.limit,
          versionId: self.versionId,
          indicatorId: self.indicatorId
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
