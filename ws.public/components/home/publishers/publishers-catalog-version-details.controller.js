'use strict';

angular.module('admin.controllers')
  .controller('PublishersCatalogVersionDetailsController', [
    '$state', 'PublisherCatalogVersionCounters',
    function ($state, PublisherCatalogVersionCounters) {
      var self = this;
      self.versionId = $state.params.versionId;

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
