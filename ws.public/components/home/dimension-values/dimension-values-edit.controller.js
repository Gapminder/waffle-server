module.exports = function (app) {
  app
    .controller('DetailDimensionValuesEditController', [
      '$state', 'PublisherCatalogVersionEntry', 'DimensionEntity', 'DimensionValueEntity',
      function ($state, PublisherCatalogVersionEntry, DimensionEntity, DimensionValueEntity) {
        var self = this;
        self.versionId = $state.params.versionId;
        self.dimensionId = $state.params.dimensionId;

        // It's data for breadcrumbs dynamic states
        PublisherCatalogVersionEntry.get({id: self.versionId},
          function (resp) {
            self.publisherRecord = {};
            self.publisherRecord.name = resp.data.publisher.name;
            self.versionRecord = resp.data;
          });

        DimensionEntity.get({id: self.dimensionId}, function (resp) {
          self.currentDimension = resp.data;
        });
        //--It's data for breadcrumbs dynamic states

        getRecord();

        self.update = function update() {
          self.record.dimension = self.dimensionId;
          DimensionValueEntity.update({id: $state.params.id}, self.record, function (resp) {
            if (resp.error) {
              console.log(resp.error);
            } else {
              $state.go('admin.home.publishers.dimensionValues.list',
                {versionId: self.versionId, dimensionId: self.dimensionId});
            }
          });
        };

        self.cancel = function cancel() {
          $state.go('admin.home.publishers.dimensionValues.list',
            {versionId: self.versionId, dimensionId: self.dimensionId});
        };

        function getRecord() {
          DimensionValueEntity.get({id: $state.params.id}, function (resp) {
            if (resp.error) {
              console.log(resp.error);
            } else {
              self.record = resp.data;
            }
          });
        }
      }
    ]);
};
