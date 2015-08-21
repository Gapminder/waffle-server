'use strict';

angular.module('admin.controllers')
  .controller('DetailIndicatorValuesEditController', [
    '$state', 'PublisherCatalogVersionEntry', 'IndicatorEntity', 'IndicatorValueEntity',
    function ($state, PublisherCatalogVersionEntry, IndicatorEntity, IndicatorValueEntity) {
      var self = this;
      self.versionId = $state.params.versionId;
      self.publisherId = $state.params.publisherId;
      self.indicatorId = $state.params.indicatorId;

      // It's data for breadcrumbs dynamic states
      PublisherCatalogVersionEntry.get({id: self.versionId},
        function (resp) {
          self.publisherRecord = {};
          self.publisherRecord.name = resp.data.publisher.name;
          self.versionRecord = resp.data;
        });

      IndicatorEntity.get({id: self.indicatorId}, function (resp) {
        self.currentIndicator = resp.data;
      });
      //--It's data for breadcrumbs dynamic states

      getRecord();

      self.update = function update() {
        self.record.indicator = self.indicatorId;
        IndicatorValueEntity.update({id: $state.params.id}, self.record, function (resp) {
          if (resp.error) {
            console.log(resp.error);
          } else {
            $state.go('admin.home.publishers.indicatorValues.list',
              {versionId: self.versionId, indicatorId: self.indicatorId});
          }
        });
      };

      self.cancel = function cancel() {
        $state.go('admin.home.publishers.indicatorValues.list',
          {versionId: self.versionId, indicatorId: self.indicatorId});
      };

      function getRecord() {
        IndicatorValueEntity.get({id: $state.params.id}, function (resp) {
          if (resp.error) {
            console.log(resp.error);
          } else {
            self.record = resp.data;
          }
        });
      }
    }
  ]);
