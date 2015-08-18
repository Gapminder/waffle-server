'use strict';

angular.module('admin.controllers')
  .controller('DetailStatsController', [
    '$state', 'PublisherDetailStats',
    function ($state, PublisherDetailStats) {
      var self = this;
      self.versionId = $state.params.versionId;

      PublisherDetailStats.get({versionId: self.versionId}, function (resp) {
        console.log(self.versionId, resp.error, resp.data);
      });
    }
  ]);
