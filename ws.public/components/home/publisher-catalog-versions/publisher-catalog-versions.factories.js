angular.module('admin.services')
  .factory('PublisherCatalogVersionsEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher-catalog-versions', {}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('PublisherCatalogVersionEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher-catalog-version/:id', {id: '@_id'}, {
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