module.exports = function (app) {
  app
    .factory('PublisherCatalogs', ['$resource', function ($resource) {
      var service = {
        getData: getData
      };

      var apiResource = $resource('/api/admin/publisher-catalog', {});

      return service;

      function getData(params, cb) {
        apiResource.get(params, function (resp) {
          return cb(resp.error, {data: resp.data, totalItems: resp.totalItems}, resp);
        });
      }
    }])
    .factory('PublisherCatalogEntry', ['$resource', function ($resource) {
      return $resource('/api/admin/publisher-catalog/:id', {id: '@_id'}, {
        get: {
          method: 'GET'
        },
        update: {
          method: 'POST'
        },
        deleteRecord: {
          method: 'DELETE'
        }
      });
    }]);
};
