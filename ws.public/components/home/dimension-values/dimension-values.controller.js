module.exports = function (app) {
  app
    .controller('DetailDimensionValuesController', [
      '$state', 'PublisherCatalogVersionEntry', 'PublisherDetailDimensionValues', 'DimensionEntity',
      function ($state, PublisherCatalogVersionEntry, PublisherDetailDimensionValues, DimensionEntity) {
        var self = this;
        self.versionId = $state.params.versionId;
        self.publisherId = $state.params.publisherId;
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

        initData();
        refresh();

        function refresh(isForce) {
          getData(isForce);
        }

        function initData() {
          self.currentData = [];
          self.limit = 10;
          self.paging = {currentPage: 1};
        }

        function getData(isForce) {
          var query = {
            skip: (self.paging.currentPage - 1) * self.limit,
            limit: self.limit,
            versionId: self.versionId,
            dimensionId: self.dimensionId
          };

          if (isForce) {
            query.force = true;
          }

          PublisherDetailDimensionValues.get(query, updateList);
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
};
