module.exports = function (app) {
  app
    .controller('FileListController', [
      '$state', 'FilesService',
      function ($state, FilesService) {
        var self = this;
        self.model = {search: ''};
        self.currentData = [];
        self.limit = 10;
        self.paging = {currentPage: 1};

        self.search = search;

        active();

        function active(isForce) {
          search(isForce);
        }

        function search(isForce) {
          var query = {
            skip: (self.paging.currentPage - 1) * self.limit,
            limit: self.limit
          };

          if (self.model.search) {
            query.search = self.model.search;
          }

          if (isForce) {
            query.force = true;
          }

          FilesService.list(query, function updateList(err, resp) {
            if (err) {
              console.error(err);
              return;
            }

            self.currentData = resp.files;
            self.totalItems = resp.count;
          });
        }
      }
    ]);
};
