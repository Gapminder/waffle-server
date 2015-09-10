module.exports = function (app) {
  app
    .factory('FilesService', ['$resource', function ($resource) {
      var resource = $resource('/api/files', {}, {
        get: {
          method: 'GET'
        }
      }, {cache: true});

      function FilesService() {
      }

      FilesService.prototype.list = function getFilesList(query, cb) {
        resource.get(query, function (res) {
          return cb(res.error, res.data);
        }, cb);
      };
      return new FilesService();
    }]);
};
