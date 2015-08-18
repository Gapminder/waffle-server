'use strict';

angular.module('admin.controllers')
  .controller('DetailDimensionsController', [
    '$state', 'PublisherDetailDimensions',
    function ($state, PublisherDetailDimensions) {
      var self = this;
      self.versionId = $state.params.versionId;

      PublisherDetailDimensions.get({versionId: self.versionId}, function (resp) {
        console.log(self.versionId, resp.error, resp.data);
      });
    }
  ]);
