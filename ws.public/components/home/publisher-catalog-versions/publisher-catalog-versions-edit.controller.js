'use strict';

angular.module('admin.controllers')
  .controller('PublisherCatalogVersionsEditController', [
    '$state', 'CollectionsService', 'PublisherCatalogVersionEntry', 'OptionsHolder',
    function ($state, CollectionsService, PublisherCatalogVersionEntry, OptionsHolder) {
      var self = this;

      getRecord();

      self.update = function update() {
        PublisherCatalogVersionEntry.update({id: $state.params.id}, self.record, function (resp) {
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

      function getOptions(cb) {
        OptionsHolder.fillPublishers(function (err, publishers) {
          self.publishers = publishers;

          OptionsHolder.fillCatalogs(function (err, catalogs) {
            self.catalogs = catalogs;
            cb();
          });
        });
      }

      function getRecord() {
        getOptions(function () {
          PublisherCatalogVersionEntry.get({id: $state.params.id}, function (resp) {
            if (resp.error) {
              console.log(resp.error);
            } else {
              self.record = resp.data;
            }
          });
        });
      }
    }
  ]);
