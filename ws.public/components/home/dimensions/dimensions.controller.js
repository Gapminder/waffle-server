module.exports = function (app) {
  app
    .controller('DetailDimensionsController', [
      '$state', 'PublisherCatalogVersionEntry', 'PublisherDetailDimensions',
      function ($state, PublisherCatalogVersionEntry, PublisherDetailDimensions) {
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

        refresh();
        self.refresh = refresh;

        function refresh(isForce) {
          var query = {versionId: self.versionId};

          if (isForce) {
            query.force = true;
          }

          PublisherDetailDimensions.get(query, function (resp) {
            self.currentData = resp.data;
          });
        }
      }
    ]);
};
