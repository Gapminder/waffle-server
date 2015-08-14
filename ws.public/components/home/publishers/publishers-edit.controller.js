'use strict';

angular.module('admin.controllers')
  .controller('PublishersEditController', [
    '$state', 'CollectionsService',
    function ($state, CollectionsService) {
      var self = this;

      self.record = null;

      getRecord();


      function getRecord() {
        console.log(11111);
      }
    }
  ]);
