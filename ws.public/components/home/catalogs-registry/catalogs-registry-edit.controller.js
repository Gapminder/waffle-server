'use strict';

angular.module('admin.controllers')
  .controller('PublisherCatalogsEditController', [
    '$state', 'PublisherCatalogEntry',
    function ($state, PublisherCatalogEntry) {
      var self = this;

      getRecord();

      self.update = function update() {
        PublisherCatalogEntry.update({id: $state.params.id}, self.record, function (resp) {
          if (resp.error) {
            console.log(resp.error);
          } else {
            $state.go('^.list');
          }
        });
      };

      self.cancel = function cancel() {
        $state.go('^.list');
      };

      function getRecord() {
        PublisherCatalogEntry.get({id: $state.params.id}, function (resp) {
          if (resp.error) {
            console.log(resp.error);
          } else {
            self.record = resp.data;
          }
        });
      }
    }
  ]);
