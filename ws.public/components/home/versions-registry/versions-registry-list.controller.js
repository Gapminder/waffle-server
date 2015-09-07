module.exports = function (app) {
  app
    .controller('PublisherCatalogVersionsListController', [
      '$state', 'CollectionsService', 'OptionsHolder', 'PublisherCatalogVersionEntry',
      function ($state, CollectionsService, OptionsHolder, PublisherCatalogVersionEntry) {
        var self = this;

        self.deleteRecord = function deleteRecord(id) {
          if (confirm('Are you sure?')) {
            PublisherCatalogVersionEntry.deleteRecord({id: id}, function (resp) {
              if (resp.error) {
                console.log(resp.error);
              } else {
                var currentRecord = _.findWhere(self.currentData, {_id: id});
                if (currentRecord) {
                  self.currentData.splice(self.currentData.indexOf(currentRecord), 1);
                }
              }
            });
          }
        };

        self.pageChanged = getData;
        self.refresh = refresh;

        refresh();

        function refresh() {
          OptionsHolder.fillPublishers(function (err, publishers) {
            self.publishersMap = {};
            publishers.forEach(function (publisher) {
              self.publishersMap[publisher._id] = publisher.name;
            });

            OptionsHolder.fillCatalogs(function (err, catalogs) {
              self.catalogsMap = {};
              catalogs.forEach(function (catalog) {
                self.catalogsMap[catalog._id] = catalog.name;
              });

              initData();
              getData();
            });
          });
        }

        function initData() {
          self.currentData = [];
          self.limit = 10;
          self.paging = {currentPage: 1};
        }

        function getData() {
          CollectionsService.getData({
            skip: (self.paging.currentPage - 1) * self.limit,
            limit: self.limit,
            list: '',
            action: 'publisherCatalogVersions'
          }, updateList);
        }

        function updateList(err, data) {
          if (err) {
            console.error(err);
            return;
          }
          self.currentData = data.data;
          self.totalItems = data.totalItems;
        }
      }
    ]);
};
