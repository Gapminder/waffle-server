module.exports = function (app) {
  app
    .factory('FileResources', ['$resource', function ($resource) {
      var resource = $resource('/api/files', {}, {
        get: {
          method: 'GET'
        }
      }, {cache: true});

      function FileResources() {
      }

      // todo: add query schema
      FileResources.prototype.list = function getFilesList(query, cb) {
        resource.get(query, function (res) {
          return cb(res.error, res.data);
        }, cb);
      };
      return new FileResources();
    }]);
};
