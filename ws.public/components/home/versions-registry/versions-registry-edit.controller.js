module.exports = function (app) {
  app
    .controller('PublisherCatalogVersionsEditController', [
      '$scope', '$state', 'CollectionsService', 'PublisherCatalogVersionEntry', 'OptionsHolder',
      function ($scope, $state, CollectionsService, PublisherCatalogVersionEntry, OptionsHolder) {
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
              self.catalogsList = catalogs;
              cb();
            });
          });
        }

        $scope.$watch('ctrl.record.publisher._id', function (newValue, oldValue) {
          if (!newValue || oldValue === newValue) {
            return;
          }

          self.catalogs = _.filter(self.catalogsList, function (catalog) {
            return catalog.publisher && catalog.publisher._id === newValue;
          });
        });

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
};
