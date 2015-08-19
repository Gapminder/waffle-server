angular.module('admin.services')
  .factory('PublisherCatalogs', ['$resource', function ($resource) {
    return $resource('/api/admin/collections/publisherCatalogs', {}, {
      get: {
        method: 'GET'
      }
    });
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
