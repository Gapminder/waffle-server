module.exports = function (app) {
  app
    .controller('PublisherCatalogsEditController', [
      '$state', 'PublisherCatalogEntry', 'OptionsHolder',
      function ($state, PublisherCatalogEntry, OptionsHolder) {
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

        function getOptions(cb) {
          OptionsHolder.fillPublishers(function (err, publishers) {
            self.publishers = publishers;
            cb();
          });
        }

        function getRecord() {
          getOptions(function () {
            PublisherCatalogEntry.get({id: $state.params.id}, function (resp) {
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
