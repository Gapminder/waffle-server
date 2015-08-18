'use strict';

angular.module('admin.controllers')
  .controller('DetailIndicatorsController', [
    '$state', 'PublisherDetailIndicators',
    function ($state, PublisherDetailIndicators) {
      var self = this;
      self.versionId = $state.params.versionId;

      PublisherDetailIndicators.get({versionId: self.versionId}, function (resp) {
        console.log(self.versionId, resp.error, resp.data);
      });
    }
  ]);
