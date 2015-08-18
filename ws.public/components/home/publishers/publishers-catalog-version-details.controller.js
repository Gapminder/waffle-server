'use strict';

angular.module('admin.controllers')
  .controller('PublishersCatalogVersionDetailsController', [
    '$state', 'PublisherCatalogVersionCounters',
    function ($state, PublisherCatalogVersionCounters) {
      var self = this;

      PublisherCatalogVersionCounters.get({
          versionId: $state.params.versionId
        },
        function (resp) {
          if (resp.error) {
            console.log(resp.error);
          }

          self.data = resp.data;
        });
    }
  ]);
