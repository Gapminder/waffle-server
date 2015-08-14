'use strict';

angular.module('admin.controllers')
  .controller('PublishersEditController', [
    '$state', 'PublisherEntry',
    function ($state, PublisherEntry) {
      var self = this;

      getRecord();

      self.update = function update() {
        PublisherEntry.update({id: $state.params.id}, self.record, function (resp) {
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
        PublisherEntry.get({id: $state.params.id}, function (resp) {
          if (resp.error) {
            console.log(resp.error);
          } else {
            self.record = resp.data;
          }
        });
      }
    }
  ]);
